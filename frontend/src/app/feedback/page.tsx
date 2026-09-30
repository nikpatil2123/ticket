'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function FeedbackForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'submitted'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMsg('No feedback token provided.');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/v1';
    
    // Validate token
    fetch(`${apiUrl}/feedback/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Invalid or expired feedback link.');
        }
        setStatus('valid');
      })
      .catch((err) => {
        setStatus('invalid');
        setErrorMsg(err.message);
      });
  }, [token]);

  const handleSubmit = async () => {
    if (rating === 0) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/v1';
      const res = await fetch(`${apiUrl}/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit feedback.');
      }

      setStatus('submitted');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (status === 'loading') return <div className="p-10 text-center">Loading...</div>;
  if (status === 'invalid') return <div className="p-10 text-center text-red-500 font-bold">{errorMsg}</div>;
  if (status === 'submitted') return <div className="p-10 text-center text-green-600 font-bold text-xl">Thank you for your feedback!</div>;

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h1 className="text-2xl font-bold text-center mb-6">Rate your experience</h1>
      <p className="text-gray-600 text-center mb-4">How would you rate the support you received?</p>
      
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-4xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:scale-110 transition-transform`}
          >
            ★
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments (Optional)</label>
        <textarea
          className="w-full p-3 border rounded-md"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us more about your experience..."
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0}
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        Submit Feedback
      </button>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeedbackForm />
    </Suspense>
  );
}
