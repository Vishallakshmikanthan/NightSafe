import { useState } from "react";
import { submitFeedback, triggerLearning } from "../services/api.js";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export default function FeedbackWidget({ street }) {
  const [rating, setRating] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [learning, setLearning] = useState(false);
  const [learnResult, setLearnResult] = useState(null);

  if (!street) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFeedback({
        street_id: street.street_id,
        hour: street.hour,
        user_score: rating * 20, // 1-5 -> 20-100
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleLearn = async () => {
    setLearning(true);
    try {
      const result = await triggerLearning();
      setLearnResult(result);
      setTimeout(() => setLearnResult(null), 4000);
    } catch {
      // ignore
    } finally {
      setLearning(false);
    }
  };

  return (
    <Card className="bg-card/75 backdrop-blur-sm animate-slide-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Safety Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>

      <p className="text-xs text-gray-400 mb-2">
        How safe does <span className="text-white font-medium">{street.street_name}</span> feel?
      </p>

      {/* Star rating */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-xl transition-all duration-200 hover:scale-110
                        ${star <= rating ? "text-yellow-400" : "text-gray-600"}`}
          >
            {star <= rating ? "\u2605" : "\u2606"}
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-2">
          {rating === 1 && "Very Unsafe"}
          {rating === 2 && "Unsafe"}
          {rating === 3 && "Neutral"}
          {rating === 4 && "Safe"}
          {rating === 5 && "Very Safe"}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting || submitted}
          variant="outline"
          size="sm"
          className="flex-1 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30"
        >
          {submitted ? "Submitted!" : submitting ? "Sending..." : "Submit"}
        </Button>
        <Button
          onClick={handleLearn}
          disabled={learning}
          variant="outline"
          size="sm"
          className="text-xs font-semibold bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
          title="Trigger model re-learning from feedback"
        >
          {learning ? "..." : "Re-learn"}
        </Button>
      </div>

      {learnResult && (
        <p className="text-[11px] text-green-400 mt-2 animate-fade-in">
          Model updated — {learnResult.feedback_applied ?? 0} feedback(s) applied
        </p>
      )}
      </CardContent>
    </Card>
  );
}
