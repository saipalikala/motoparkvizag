export default function ProductPickerCard({
    product,
    selected,
    onToggle
}) {

    const image =
        product.variants?.[0]?.images?.[0] ||
        "/placeholder.png";

    return (

        <div className={`picker-card ${selected ? "selected" : ""}`}>

            <img
                src={image}
                alt={product.name}
            />

            <div className="picker-info">

                <h4>{product.name}</h4>

                <p>₹{product.price}</p>

            </div>

            <button
                className="picker-btn"
                onClick={onToggle}
            >
                {selected ? "Remove" : "Add"}
            </button>

        </div>

    );

}