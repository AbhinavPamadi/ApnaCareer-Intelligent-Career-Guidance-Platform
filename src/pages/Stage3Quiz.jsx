import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { questionBank } from '../data/questionBank';
import { generateResults } from '../engine/resultGenerator';
import {
  averageDomainConfidence,
  averageScore,
  blendDomainScores,
  evaluateStage3Answer,
  fetchGithubRepos,
  generateStage3Questions,
} from '../engine/stage3';
import { useToast } from '../components/ToastContext';

export default function Stage3Quiz() {
  const navigate = useNavigate();
  const addToast = useToast();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [repos, setRepos] = useState([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [evaluations, setEvaluations] = useState([]);

  const selectedRepos = useMemo(
    () => repos.filter((r) => selectedRepoIds.includes(String(r.id))),
    [repos, selectedRepoIds]
  );

  const currentQuestion = questions[index] || null;
  const progress = questions.length ? Math.round((index / questions.length) * 100) : 0;

  useEffect(() => {
    async function bootstrap() {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/auth');
          return;
        }

        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) {
          navigate('/dashboard');
          return;
        }

        const userData = userSnap.data();
        if (!userData.quizComplete) {
          navigate('/quiz');
          return;
        }
        if (userData.stage3Complete) {
          navigate('/results');
          return;
        }
      } catch (err) {
        console.error(err);
        addToast('Unable to initialize Stage 3. Please retry.', 'error');
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [navigate, addToast]);

  const toggleRepo = (repoId) => {
    setSelectedRepoIds((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId]
    );
  };

  const handleFetchRepos = async () => {
    setProcessing(true);
    try {
      const fetched = await fetchGithubRepos(githubUsername);
      setRepos(fetched);
      setSelectedRepoIds([]);
      if (!fetched.length) addToast('No public repositories found for this username.', 'info');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to fetch repositories.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (selectedRepos.length < 1) {
      addToast('Select at least one repository to continue.', 'error');
      return;
    }
    setProcessing(true);
    try {
      const uid = auth.currentUser.uid;
      const bktData = await getDoc(doc(db, 'bkt_beliefs', uid)).then((s) => s.data());
      const generated = await generateStage3Questions({
        githubUsername,
        repos: selectedRepos,
        priorDomainBeliefs: bktData?.domainBeliefs || {},
      });
      if (!generated.length) throw new Error('Could not generate Stage 3 questions.');
      setQuestions(generated);
      setIndex(0);
      setEvaluations([]);
      setAnswerText('');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to generate questions.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const finalizeResults = async (finalEvaluations) => {
    const uid = auth.currentUser.uid;
    const [bktData, personalityData, sessionData] = await Promise.all([
      getDoc(doc(db, 'bkt_beliefs', uid)).then((s) => s.data()),
      getDoc(doc(db, 'personality_responses', uid)).then((s) => s.data()),
      getDoc(doc(db, 'quiz_sessions', uid)).then((s) => s.data()),
    ]);

    const answersSnap = await getDocs(collection(db, 'quiz_responses', uid, 'answers'));
    const stage2Answered = answersSnap.docs.map((d) => d.data());
    const stage2Subjective = stage2Answered.filter((a) => a.type === 'short' || a.type === 'long');

    const stage2Avg = averageScore(stage2Subjective, 'evaluationScore');
    const stage3Avg = averageScore(finalEvaluations, 'score');
    const stage3Domains = averageDomainConfidence(finalEvaluations);

    const stage2Beliefs = bktData?.domainBeliefs || {};
    const blendedBeliefs = blendDomainScores(stage2Beliefs, stage3Domains, 0.35);

    const finalResultBase = generateResults({
      bktBeliefs: { ...bktData, domainBeliefs: blendedBeliefs },
      personalityData: personalityData || { personalityVector: {} },
      session: sessionData || { remedialTriggered: false },
      questionBank,
      answeredQuestions: stage2Answered,
    });

    const finalResults = {
      ...finalResultBase,
      generatedAt: new Date().toISOString(),
      stage3: {
        githubUsername,
        selectedRepos: selectedRepos.map((r) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          html_url: r.html_url,
          language: r.language,
        })),
        averageScore: stage3Avg,
        domainSignals: stage3Domains,
        questionsAsked: questions.length,
      },
      stage2: {
        averageSubjectiveScore: stage2Avg,
        domainScoresBeforeStage3: stage2Beliefs,
      },
      answerQualityComparison: {
        stage2Average: stage2Avg,
        stage3Average: stage3Avg,
        delta: Number((stage3Avg - stage2Avg).toFixed(4)),
      },
    };

    await Promise.all([
      setDoc(doc(db, 'results', uid), finalResults),
      setDoc(
        doc(db, 'stage3_sessions', uid),
        {
          uid,
          githubUsername,
          selectedRepos: selectedRepos.map((r) => r.full_name),
          completedAt: new Date().toISOString(),
          evaluations: finalEvaluations,
          stage3Domains,
        },
        { merge: true }
      ),
      updateDoc(doc(db, 'users', uid), {
        assessmentStatus: 'complete',
        stage3Complete: true,
        currentPhase: 5,
      }),
    ]);

    navigate('/results');
  };

  const handleSkipStage3 = async () => {
    if (!window.confirm('Skip Stage 3 GitHub evaluation and finish with current Stage 2 results?')) return;
    setProcessing(true);
    try {
      const uid = auth.currentUser.uid;
      const [bktData, personalityData, sessionData] = await Promise.all([
        getDoc(doc(db, 'bkt_beliefs', uid)).then((s) => s.data()),
        getDoc(doc(db, 'personality_responses', uid)).then((s) => s.data()),
        getDoc(doc(db, 'quiz_sessions', uid)).then((s) => s.data()),
      ]);

      const answersSnap = await getDocs(collection(db, 'quiz_responses', uid, 'answers'));
      const stage2Answered = answersSnap.docs.map((d) => d.data());
      const stage2Subjective = stage2Answered.filter((a) => a.type === 'short' || a.type === 'long');
      const stage2Avg = averageScore(stage2Subjective, 'evaluationScore');

      const baseResults = generateResults({
        bktBeliefs: bktData || { domainBeliefs: {} },
        personalityData: personalityData || { personalityVector: {} },
        session: sessionData || { remedialTriggered: false },
        questionBank,
        answeredQuestions: stage2Answered,
      });

      const finalResults = {
        ...baseResults,
        generatedAt: new Date().toISOString(),
        stage3: {
          skipped: true,
          skippedAt: new Date().toISOString(),
          githubUsername: githubUsername || '',
          selectedRepos: [],
          averageScore: null,
          domainSignals: null,
          questionsAsked: 0,
        },
        stage2: {
          averageSubjectiveScore: stage2Avg,
          domainScoresBeforeStage3: bktData?.domainBeliefs || {},
        },
        answerQualityComparison: {
          stage2Average: stage2Avg,
          stage3Average: null,
          delta: null,
        },
      };

      await Promise.all([
        setDoc(doc(db, 'results', uid), finalResults),
        setDoc(
          doc(db, 'stage3_sessions', uid),
          {
            uid,
            skipped: true,
            skippedAt: new Date().toISOString(),
            githubUsername: githubUsername || '',
          },
          { merge: true }
        ),
        updateDoc(doc(db, 'users', uid), {
          assessmentStatus: 'complete',
          stage3Complete: true,
          currentPhase: 5,
        }),
      ]);

      navigate('/results');
    } catch (err) {
      console.error(err);
      addToast('Unable to skip Stage 3 right now. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !answerText.trim()) return;
    setProcessing(true);
    try {
      const evaluation = await evaluateStage3Answer({
        question: currentQuestion,
        answerText,
        repoContext: selectedRepos,
      });

      const enriched = {
        ...evaluation,
        questionId: currentQuestion.questionId,
        questionText: currentQuestion.text,
        domain: currentQuestion.domain,
        answerText,
        answeredAt: new Date().toISOString(),
      };

      const updated = [...evaluations, enriched];
      setEvaluations(updated);

      const uid = auth.currentUser.uid;
      await setDoc(doc(db, 'stage3_responses', uid, 'answers', currentQuestion.questionId), enriched);

      if (index + 1 >= questions.length) {
        await finalizeResults(updated);
      } else {
        setIndex((v) => v + 1);
        setAnswerText('');
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to evaluate answer. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Stage 3...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-white border border-gray-100 shadow-sm rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stage 3: GitHub Project Evaluation</h1>
          <p className="text-gray-600 mt-2">
            Add your GitHub username, pick projects, answer project-specific LLM questions, and finalize your domain fit.
          </p>
          <div className="mt-4">
            <button
              onClick={handleSkipStage3}
              disabled={processing}
              className="text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg disabled:opacity-50"
            >
              Skip Stage 3
            </button>
          </div>
        </div>

        {questions.length === 0 && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">GitHub Username</label>
              <div className="flex gap-2">
                <input
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="e.g. octocat"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                />
                <button
                  onClick={handleFetchRepos}
                  disabled={processing || !githubUsername.trim()}
                  className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {processing ? 'Fetching...' : 'Fetch Projects'}
                </button>
              </div>
            </div>

            {repos.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-gray-800">Select projects to base questions on</p>
                <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {repos.map((repo) => (
                    <label key={repo.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedRepoIds.includes(String(repo.id))}
                        onChange={() => toggleRepo(String(repo.id))}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{repo.full_name}</p>
                        <p className="text-sm text-gray-600">{repo.description || 'No description'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {repo.language} • ⭐ {repo.stargazers_count} • Forks {repo.forks_count}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={processing || selectedRepos.length === 0}
                  className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {processing ? 'Generating...' : 'Generate Stage 3 Questions'}
                </button>
              </div>
            )}
          </>
        )}

        {currentQuestion && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Question {index + 1} / {questions.length}
              </span>
              <span>{progress}% completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                {currentQuestion.domain.replace('_', ' ')} • {currentQuestion.difficulty}
              </p>
              <p className="text-gray-900 font-medium">{currentQuestion.text}</p>
            </div>

            <textarea
              rows={8}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Explain clearly with references to your project choices and implementation decisions."
              className="w-full border border-gray-300 rounded-lg p-4"
            />

            <button
              onClick={handleSubmitAnswer}
              disabled={processing || !answerText.trim()}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
            >
              {processing ? 'Evaluating...' : index + 1 === questions.length ? 'Finish Stage 3' : 'Submit & Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
