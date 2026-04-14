const getStatusStyles = (status) => {
  if (status === 'Under Review') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'In Progress') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'Planned') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

export default function FeedbackCard({ feedback }) {
  return (
    <article className="bg-white border border-gray-100 rounded-xl p-4 md:p-5 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{feedback.title}</h3>
          <p className="text-sm text-gray-500">
            {feedback.author} • {feedback.date}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(feedback.status)}`}
        >
          {feedback.status}
        </span>
      </div>
      <p className="text-gray-700 text-sm">{feedback.description}</p>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <span className="bg-gray-100 px-2.5 py-1 rounded-full">{feedback.category}</span>
        <span>👍 {feedback.upvotes}</span>
        <span>👎 {feedback.downvotes}</span>
        <span>💬 {feedback.replies} replies</span>
      </div>
    </article>
  );
}
