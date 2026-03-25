const AdminTable = ({ columns, data, renderRow }) => {
    return (
        <div className="admin-table-container">

            <table className="admin-table">

                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i}>{col}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length}>No data found</td>
                        </tr>
                    ) : (
                        data.map(renderRow)
                    )}
                </tbody>

            </table>

        </div>
    );
};

export default AdminTable;