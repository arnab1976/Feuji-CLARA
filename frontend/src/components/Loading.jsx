export default function Loading({ label = "Loading…" }) {
  return (
    <div className="center">
      <span className="spin" /> {label}
    </div>
  );
}
