import CountUp from "react-countup";

const StatCard = ({ title, value, icon: Icon }) => {

    return (
        <div className="stat-card">

            <div className="stat-top">

                <div>
                    <p className="stat-title">{title}</p>

                    <h2 className="stat-value">
                        <CountUp end={value} duration={1.5} />
                    </h2>
                </div>

                <div className="stat-icon">
                    <Icon size={20} />
                </div>

            </div>

        </div>
    );
};

export default StatCard;