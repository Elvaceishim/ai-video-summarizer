export default function TranscriptDisplay({ data }) {
  if (!data) return null;

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          📄 Transcript
        </h2>
        <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap text-sm text-gray-700 overflow-x-auto">
          {data.transcript}
        </pre>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          🧠 Summary
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          {data.summary.split('\n').map((line, idx) => (
            <li key={idx} className="text-gray-700">{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
