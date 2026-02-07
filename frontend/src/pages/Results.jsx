import { useParams } from "react-router-dom";

export default function Results() {
  const { id } = useParams();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Optimization Results</h1>
      <p className="text-slate-400">Run ID: {id}</p>
    </div>
  );
}
