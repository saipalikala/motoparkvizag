import mongoose from "mongoose";

/* ==============================
SECTION SCHEMA
============================== */

const sectionSchema = new mongoose.Schema({

    key: {
        type: String,
        required: true
    },

    title: {
        type: String,
        default: ""
    },

    enabled: {
        type: Boolean,
        default: true
    },

    order: {
        type: Number,
        required: true
    },

    settings: {
        title: String,
        collection: String,
        category: String,
        limit: Number,
        videoUrl: String
    }

});
/* ==============================
HOME LAYOUT SCHEMA
============================== */

const homeLayoutSchema = new mongoose.Schema({

    sections: [sectionSchema]

}, {
    timestamps: true
});

/* ==============================
EXPORT MODEL
============================== */

export default mongoose.model("HomeLayout", homeLayoutSchema);