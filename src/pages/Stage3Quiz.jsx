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
  fetchLinkedinProfile,
  generateStage3Questions,
} from '../engine/stage3';
import { useToast } from '../components/ToastContext';

export default function Stage3Quiz() {
  const navigate = useNavigate();
  const addToast = useToast();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinProfileSummary, setLinkedinProfileSummary] = useState('');
  const [phase, setPhase] = useState('github-setup');
  const [githubSkipped, setGithubSkipped] = useState(false);
  const [repos, setRepos] = useState([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [githubEvaluations, setGithubEvaluations] = useState([]);
  const [linkedinEvaluations, setLinkedinEvaluations] = useState([]);

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

  const handleFetchGithub = async () => {
    if (!githubUsername.trim()) {
      addToast('Enter a GitHub username to fetch repositories.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const fetchedRepos = await fetchGithubRepos(githubUsername);
      setRepos(fetchedRepos);
      setSelectedRepoIds(fetchedRepos.slice(0, 3).map((repo) => String(repo.id)));
      if (!fetchedRepos.length) {
        addToast('No public repositories found for this GitHub username.', 'error');
      } else {
        addToast(`Found ${fetchedRepos.length} public repositories.`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to fetch GitHub repositories.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleFetchLinkedIn = async () => {
    if (!linkedinUrl.trim()) {
      addToast('Enter a LinkedIn profile URL.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const profile = await fetchLinkedinProfile(linkedinUrl);
      setLinkedinProfileSummary(profile.profileSummary || '');
      addToast('LinkedIn profile fetched successfully.', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to fetch LinkedIn profile.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateQuestions = async (source) => {
    const effectiveRepos = selectedRepos.length > 0 ? selectedRepos : repos.slice(0, 3);
    if (source === 'github' && !effectiveRepos.length) {
      addToast('Fetch a GitHub profile with public repositories before generating questions.', 'error');
      return;
    }
    if (source === 'linkedin' && !linkedinProfileSummary.trim()) {
      addToast('Fetch your LinkedIn profile before generating questions.', 'error');
      return;
    }

    if (githubUsername.trim() && repos.length > 0 && selectedRepos.length === 0) {
      setSelectedRepoIds(effectiveRepos.map((r) => String(r.id)));
    }

    setProcessing(true);
    try {
      const uid = auth.currentUser.uid;
      const bktData = await getDoc(doc(db, 'bkt_beliefs', uid)).then((s) => s.data());
      const generated = await generateStage3Questions({
        source,
        githubUsername,
        repos: source === 'github' ? effectiveRepos : [],
        linkedinProfileSummary: source === 'linkedin' ? linkedinProfileSummary : '',
        priorDomainBeliefs: bktData?.domainBeliefs || {},
      });
      const expectedCount = source === 'linkedin' ? 3 : 5;
      if (generated.length !== expectedCount) throw new Error(`Expected ${expectedCount} ${source} questions, received ${generated.length}.`);
      setQuestions(generated);
      setIndex(0);
      setAnswerText('');
      setPhase(`${source}-questions`);
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to generate questions.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const normalizeLinkedInUrl = (rawValue) => {
    const value = (rawValue || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('linkedin.com')) return `https://${value}`;
    if (!value.includes('linkedin.com')) return `https://linkedin.com/in/${value.replace(/^@/, '').replace(/\s+/g, '')}`;
    return value;
  };

  const finalizeResults = async (finalLinkedinEvaluations, { githubSkipped: skipGithub = githubSkipped, linkedinSkipped = false } = {}) => {
    const uid = auth.currentUser.uid;
    const normalizedLinkedinUrl = normalizeLinkedInUrl(linkedinUrl);
    const finalGithubEvaluations = skipGithub ? [] : githubEvaluations;
    const finalEvaluations = [...finalGithubEvaluations, ...finalLinkedinEvaluations];
    const [bktData, personalityData, sessionData] = await Promise.all([
      getDoc(doc(db, 'bkt_beliefs', uid)).then((s) => s.data()),
      getDoc(doc(db, 'personality_responses', uid)).then((s) => s.data()),
      getDoc(doc(db, 'quiz_sessions', uid)).then((s) => s.data()),
    ]);

    const answersSnap = await getDocs(collection(db, 'quiz_responses', uid, 'answers'));
    const stage2Answered = answersSnap.docs.map((d) => d.data());
    const stage2Subjective = stage2Answered.filter((a) => a.type === 'short' || a.type === 'long');

    const stage2Avg = averageScore(stage2Subjective, 'evaluationScore');
    const githubAverageScore = skipGithub ? null : averageScore(finalGithubEvaluations, 'score');
    const linkedinAverageScore = linkedinSkipped ? null : averageScore(finalLinkedinEvaluations, 'score');
    const stage3Avg = githubAverageScore;
    const stage3Domains = skipGithub ? null : averageDomainConfidence(finalGithubEvaluations);

    const stage2Beliefs = bktData?.domainBeliefs || {};
    const blendedBeliefs = skipGithub
      ? stage2Beliefs
      : blendDomainScores(stage2Beliefs, stage3Domains, 0.35);

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
        skipped: skipGithub,
        skippedAt: skipGithub ? new Date().toISOString() : null,
        githubUsername,
        linkedinUrl: normalizedLinkedinUrl,
        githubAverageScore,
        selectedRepos: (skipGithub ? [] : selectedRepos).map((r) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          html_url: r.html_url,
          language: r.language,
        })),
        averageScore: stage3Avg,
        domainSignals: stage3Domains,
        questionsAsked: finalGithubEvaluations.length,
        githubQuestionsAsked: finalGithubEvaluations.length,
      },
      stage4: {
        skipped: linkedinSkipped,
        skippedAt: linkedinSkipped ? new Date().toISOString() : null,
        averageScore: linkedinAverageScore,
        questionsAsked: finalLinkedinEvaluations.length,
      },
      stage2: {
        averageSubjectiveScore: stage2Avg,
        domainScoresBeforeStage3: stage2Beliefs,
      },
      answerQualityComparison: {
        stage2Average: stage2Avg,
        stage3Average: stage3Avg,
        delta: skipGithub ? null : Number((stage3Avg - stage2Avg).toFixed(4)),
        linkedinStage4Average: linkedinAverageScore,
      },
    };

    await Promise.all([
      setDoc(doc(db, 'results', uid), finalResults),
      setDoc(
        doc(db, 'stage3_sessions', uid),
        {
          uid,
          githubUsername,
          linkedinUrl: normalizedLinkedinUrl,
          selectedRepos: (skipGithub ? [] : selectedRepos).map((r) => r.full_name),
          completedAt: new Date().toISOString(),
          evaluations: finalEvaluations,
          githubEvaluations: finalGithubEvaluations,
          linkedinEvaluations: finalLinkedinEvaluations,
          linkedinAverageScore,
          linkedinSkipped,
          linkedinSkippedAt: linkedinSkipped ? new Date().toISOString() : null,
          githubSkipped: skipGithub,
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

  const handleSkipStage3 = () => {
    if (!window.confirm('Skip Stage 3 GitHub evaluation and continue to Stage 4 LinkedIn?')) return;
    setGithubSkipped(true);
    setGithubEvaluations([]);
    setQuestions([]);
    setIndex(0);
    setAnswerText('');
    setPhase('linkedin-setup');
    addToast('Stage 3 skipped. Continue with Stage 4 LinkedIn.', 'success');
  };

  const handleSkipStage4 = async () => {
    if (!window.confirm('Skip Stage 4 LinkedIn evaluation and finish with your GitHub and Stage 2 results?')) return;
    setProcessing(true);
    try {
      await finalizeResults(linkedinEvaluations, { githubSkipped, linkedinSkipped: true });
    } catch (err) {
      console.error(err);
      addToast('Unable to skip Stage 4 right now. Please try again.', 'error');
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
        repoContext: currentQuestion.source === 'github' ? selectedRepos : [],
        linkedinContext: currentQuestion.source === 'linkedin' ? linkedinProfileSummary : '',
      });

      const enriched = {
        ...evaluation,
        questionId: currentQuestion.questionId,
        questionText: currentQuestion.text,
        domain: currentQuestion.domain,
        source: currentQuestion.source,
        answerText,
        answeredAt: new Date().toISOString(),
      };

      const currentEvaluations = phase === 'github-questions' ? githubEvaluations : linkedinEvaluations;
      const updated = [...currentEvaluations, enriched];

      const uid = auth.currentUser.uid;
      await setDoc(doc(db, 'stage3_responses', uid, 'answers', currentQuestion.questionId), enriched);

      if (index + 1 >= questions.length) {
        if (phase === 'github-questions') {
          setGithubEvaluations(updated);
          setQuestions([]);
          setIndex(0);
          setAnswerText('');
          setPhase('linkedin-setup');
          addToast('GitHub assessment complete. Continue with LinkedIn.', 'success');
        } else {
          await finalizeResults(updated);
        }
      } else {
        if (phase === 'github-questions') setGithubEvaluations(updated);
        else setLinkedinEvaluations(updated);
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
          <h1 className="text-2xl font-bold text-gray-900">{phase.startsWith('github') ? 'Stage 3: GitHub Assessment' : 'Stage 4: LinkedIn Assessment'}</h1>
          <p className="text-gray-600 mt-2">{phase.startsWith('github') ? 'Complete five GitHub-based questions, then continue to the LinkedIn assessment.' : 'Complete three separate questions based on your LinkedIn profile.'}</p>
          <div className="mt-4">
            <button
              onClick={phase.startsWith('linkedin') ? handleSkipStage4 : handleSkipStage3}
              disabled={processing}
              className="text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg disabled:opacity-50"
            >
              {phase.startsWith('linkedin') ? 'Skip Stage 4' : 'Skip Stage 3'}
            </button>
          </div>
        </div>

        {phase === 'github-setup' && questions.length === 0 && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">GitHub Username</label>
                <input
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="e.g. octocat"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleFetchGithub}
                  disabled={processing || !githubUsername.trim()}
                  className="bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg disabled:opacity-50"
                >
                  {processing ? 'Fetching...' : 'Fetch GitHub Repositories'}
                </button>
              </div>
            </div>

            {repos.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-gray-800">Select GitHub repositories</p>
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
                          {repo.language} • Stars {repo.stargazers_count} • Forks {repo.forks_count}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => handleGenerateQuestions('github')}
                  disabled={processing || !selectedRepos.length}
                  className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {processing ? 'Generating...' : 'Generate 5 GitHub Questions'}
                </button>
              </div>
            )}
          </>
        )}

        {phase === 'linkedin-setup' && questions.length === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">LinkedIn Profile URL</label>
              <input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="e.g. https://www.linkedin.com/in/yourname"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
            <button
              onClick={handleFetchLinkedIn}
              disabled={processing || !linkedinUrl.trim()}
              className="bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg disabled:opacity-50"
            >
              {processing ? 'Fetching...' : 'Fetch LinkedIn Profile'}
            </button>
            {linkedinProfileSummary && (
              <div className="space-y-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="font-semibold text-gray-800">LinkedIn profile ready</p>
                  <p className="text-sm text-gray-600 mt-1">{linkedinProfileSummary.slice(0, 300)}{linkedinProfileSummary.length > 300 ? '...' : ''}</p>
                </div>
                <button
                  onClick={() => handleGenerateQuestions('linkedin')}
                  disabled={processing}
                  className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {processing ? 'Generating...' : 'Generate 3 LinkedIn Questions'}
                </button>
              </div>
            )}
          </div>
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
              {processing ? 'Evaluating...' : index + 1 === questions.length ? phase === 'github-questions' ? 'Finish Stage 3 & Continue to Stage 4' : 'Finish Stage 4' : 'Submit & Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
