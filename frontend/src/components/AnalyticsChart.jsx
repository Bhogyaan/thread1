import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const AnalyticsChart = ({ type, data }) => {
	if (type === "pie") {
		return (
			<PieChart width={400} height={400}>
				<Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label />
				<Tooltip />
				<Legend />
			</PieChart>
		);
	}

	if (type === "bar") {
		return (
			<BarChart width={400} height={300} data={data}>
				<XAxis dataKey="name" />
				<YAxis />
				<Tooltip />
				<Legend />
				<Bar dataKey="value" fill="#8884d8" />
			</BarChart>
		);
	}

	return null;
};

export default AnalyticsChart;