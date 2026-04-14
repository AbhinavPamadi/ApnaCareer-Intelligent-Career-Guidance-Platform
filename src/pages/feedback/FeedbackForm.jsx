export default function FeedbackForm({
  categories,
  newFeedback,
  setNewFeedback,
  handleSubmitFeedback,
  setShowFeedbackForm,
  isSubmitting,
}) {
  return (
    <form
      onSubmit={handleSubmitFeedback}
      className="border border-blue-100 rounded-xl bg-blue-50/50 p-4 md:p-5 grid gap-3"
    >
      <input
        type="text"
        value={newFeedback.title}
        onChange={(e) => setNewFeedback((prev) => ({ ...prev, title: e.target.value }))}
        placeholder="Feedback title"
        className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        required
      />
      <textarea
        rows={3}
        value={newFeedback.description}
        onChange={(e) => setNewFeedback((prev) => ({ ...prev, description: e.target.value }))}
        placeholder="Describe your suggestion or issue"
        className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
        required
      />
      <div className="grid md:grid-cols-2 gap-3">
        <select
          value={newFeedback.category}
          onChange={(e) => setNewFeedback((prev) => ({ ...prev, category: e.target.value }))}
          className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {categories
            .filter((category) => category !== 'All')
            .map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
        </select>
        <input
          type="text"
          value={newFeedback.author}
          onChange={(e) => setNewFeedback((prev) => ({ ...prev, author: e.target.value }))}
          placeholder="Your name (optional)"
          className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowFeedbackForm(false)}
          className="bg-white text-gray-700 font-semibold px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </form>
  );
}
