const StatusBadge = ({ status }) => {

    const colors = {
        pending: "badge-yellow",
        shipped: "badge-blue",
        delivered: "badge-green",
        cancelled: "badge-red"
    };

    return (
        <span className={`status-badge ${colors[status]}`}>
            {status}
        </span>
    );
};

export default StatusBadge;