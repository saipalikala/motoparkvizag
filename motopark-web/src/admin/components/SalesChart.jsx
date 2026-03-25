import {
    LineChart,
    Line,
    XAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";

const data = [
    { day: "Mon", sales: 2400 },
    { day: "Tue", sales: 3200 },
    { day: "Wed", sales: 2800 },
    { day: "Thu", sales: 4200 },
    { day: "Fri", sales: 5100 },
    { day: "Sat", sales: 3900 },
    { day: "Sun", sales: 6200 }
];

const SalesChart = () => {

    return (
        <div className="sales-chart">

            <h3>Weekly Sales</h3>

            <ResponsiveContainer width="100%" height={300}>

                <LineChart data={data}>

                    <XAxis dataKey="day" />
                    <Tooltip />

                    <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#ff6b3d"
                        strokeWidth={3}
                    />

                </LineChart>

            </ResponsiveContainer>

        </div>
    );
};

export default SalesChart;