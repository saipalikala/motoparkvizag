const VariantEditor = ({ variant, updateVariant }) => {

    const updateStock = (index, value) => {

        const newSizes = [...variant.sizes];

        newSizes[index].stock = value;

        updateVariant({
            ...variant,
            sizes: newSizes
        });

    };

    return (

        <div className="variant-editor">

            <h4>{variant.color}</h4>

            {variant.sizes.map((s, i) => (

                <div key={i} className="size-row">

                    <span>{s.size}</span>

                    <input
                        type="number"
                        value={s.stock}
                        onChange={(e) =>
                            updateStock(i, e.target.value)
                        }
                    />

                </div>

            ))}

        </div>

    );
};

export default VariantEditor;