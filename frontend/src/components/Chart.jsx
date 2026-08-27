import {
  Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const COLORS = ["#d6a648", "#2f6fb3", "#4ea884", "#b5591f", "#7a3f9e", "#6f8fc4"];

const tooltipStyle = {
  background: "#172236",
  border: "1px solid #26344c",
  borderRadius: 8,
  color: "#dbe4f0",
  fontSize: 12,
};

export default function Chart({ spec, height = 260 }) {
  if (!spec?.data?.length) return null;
  const data = spec.data.map((d) => ({ name: d.label, value: d.value }));

  return (
    <div className="chartbox">
      <div className="ctitle">{spec.title}</div>
      <ResponsiveContainer width="100%" height={height}>
        {spec.type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        ) : spec.type === "line" ? (
          <LineChart data={data}>
            <XAxis dataKey="name" stroke="#5f6f88" fontSize={11} />
            <YAxis stroke="#5f6f88" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke="#d6a648" strokeWidth={2} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#5f6f88" fontSize={11} />
            <YAxis stroke="#5f6f88" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} />
            <Bar dataKey="value" radius={[5, 5, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
