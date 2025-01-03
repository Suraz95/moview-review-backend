const { isValidObjectId } = require("mongoose");
const Actor = require("../models/actor");
const cloudinary = require("cloudinary").v2;
require("regenerator-runtime/runtime");

// Configuration
cloudinary.config({
   cloud_name: process.env.CLOUDINARY_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_SECRET_KEY,
   secure: true,
});

//  Create actor @POST
const createActor = async (req, res) => {
   const { name, description, gender } = req.body;
   // creating new Actor instance
   const newActor = Actor({
      name,
      description,
      gender,
   });
   // Cloudinary Image upload
   // making image upload optional
   if (req.file) {
      const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
         gravity: "face",
         height: 500,
         width: 500,
         crop: "thumb",
      });
      newActor.avatar = {
         url: secure_url,
         public_id: public_id,
      };
   }
   // saving actor to db
   const savedActor = await newActor.save();
   res.status(201).json({
      actor: {
         id: savedActor._id,
         name: savedActor.name,
         gender: savedActor.gender,
         avatar: savedActor?.avatar?.url,
         public_id: savedActor?.avatar?.public_id,
      },
   });
};

// update actor @POST
const updateActor = async (req, res) => {
   const { name, description, gender } = req.body;
   const { file } = req;
   const { actorId } = req.params;

   // checking if actor exists in DB
   if (!isValidObjectId(actorId))
      // isValidObjectId() is mongoose method
      return res.status(404).json({ error: "Invalid actor / actor Not Found" });

   const actor = await Actor.findById(actorId);
   if (!actor) return res.status(404).json({ error: "Invalid Actor / Actor Not Found" });

   // delete old image from storage if new image is present
   if (actor.avatar?.public_id && file) {
      const { result } = await cloudinary.uploader.destroy(actor.avatar?.public_id);
      if (result !== "ok") {
         return res.status(404).json({ error: "Not able to delete image from Cloud" });
      }
   }

   // -> if yes then remove the old image and upload the new image
   if (file) {
      const { secure_url, public_id } = await cloudinary.uploader.upload(file.path);
      actor.avatar = { url: secure_url, public_id };
   }
   actor.name = name;
   actor.description = description;
   actor.gender = gender;
   const savedActor = await actor.save();

   res.status(201).json({
      actor: {
         id: savedActor._id,
         name: savedActor.name,
         gender: savedActor.gender,
         avatar: savedActor?.avatar?.url,
         public_id: savedActor?.avatar?.public_id,
      },
   });
};

// Delete actor @DELETE
const removeActor = async (req, res) => {
   const { actorId } = req.params;

   // checking if actor exists in DB
   if (!isValidObjectId(actorId))
      // isValidObjectId() is mongoose method
      return res.status(404).json({ error: "Invalid actor / actor Not Found" });

   const actor = await Actor.findById(actorId);
   if (!actor) return res.status(404).json({ error: "Invalid Actor / Actor Not Found" });

   // delete old image from storage if new image is present
   if (actor.avatar?.public_id) {
      const { result } = await cloudinary.uploader.destroy(actor.avatar?.public_id);
      if (result !== "ok") {
         return res.status(404).json({ error: "Not able to delete image from Cloud" });
      }
   }

   await Actor.findByIdAndDelete(actorId);
   res.status(200).json({ msg: "Actor Deleted Successfully" });
};

// Search Actors @GET
const searchActor = async (req, res) => {
   const { name } = req.query;
   // const results = await Actor.find({ $text: { $search: `"${query.name}"` } }); -- Full text Search
   if (!name) return res.json({ error: "Search Field cannot be empty" });
   const results = await Actor.find({ name: { $regex: name, $options: "i" } });
   res.status(200).json({ data: results });
};

// Latest Actors @GET
const latestActors = async (req, res) => {
   const results = await Actor.find().sort({ createdAt: "-1" }).limit(12);
   res.status(200).json({ data: results });
};

// Single Actor @GET
const getSingleActor = async (req, res) => {
   const { actorId } = req.params;

   // checking if actor exists in DB
   if (!isValidObjectId(actorId))
      // isValidObjectId() is mongoose method
      return res.status(404).json({ error: "Invalid actor / actor Not Found" });

   const actor = await Actor.findById(actorId);
   if (!actor) res.status(404).json({ error: "Invalid actor / actor Not Found" });

   res.status(200).json({ data: actor });
};

// get All Actors @GET
const getActors = async (req, res) => {
   const { pageNo = 0, limit = 9 } = req.query;
   const actors = await Actor.find({})
      .sort({ createdAt: "-1" })
      .skip(Number(pageNo) * Number(limit))
      .limit(Number(limit));
   res.status(200).json({ data: { actors } });
};

module.exports = {
   createActor,
   updateActor,
   removeActor,
   searchActor,
   latestActors,
   getSingleActor,
   getActors,
};
