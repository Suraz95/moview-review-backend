const { isValidObjectId } = require("mongoose");
const Movie = require("../models/movie");
const { getAvgRatings } = require("../utils/helper");
require("regenerator-runtime/runtime");
const cloudinary = require("cloudinary").v2;

// Configuration
cloudinary.config({
   cloud_name: process.env.CLOUDINARY_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_SECRET_KEY,
   secure: true,
});

// Uploading Trailer only @POST
const uploadTrailer = async (req, res) => {
   const { file } = req;
   if (!file) return res.json({ error: "Video File Missing" });

   const { secure_url, public_id } = await cloudinary.uploader.upload(file.path, {
      resource_type: "video",
   });

   res.status(201).json({ url: secure_url, public_id });
};

// create new Movie @POST
const createMovie = async (req, res) => {
   const { file, body } = req;
   const {
      title, // "some title" //*
      storyLine, // "Some description" //*
      director, // "Some name"
      releaseDate, // "07-12-2009" //*
      status, // "private" //*
      type, // "movie" //*
      genres, // ["Sci-fi", "Action","Adventure"] //*
      tags, // ["action","movie","hollywood"] //*
      cast, // [{actor:"sds1212sdf",roleAs:"John Doe",leadActor:true}] //*
      writers, // ['12121','asd231]
      trailer, // {url:'https:://', public_id:"sdsdqw1212"} //*
      language, // "english" //*
   } = body;
   console.log(req.body);

   const newMovie = Movie({
      title,
      storyLine,
      releaseDate,
      status,
      type,
      genres,
      tags,
      cast,
      trailer,
      language,
   });

   // director and writers are optional fields hence, explicit checking
   if (director) {
      if (!isValidObjectId(director)) return res.json({ error: "Invalid Director Id" });
      newMovie.director = director;
   }
   if (writers) {
      for (let writer of writers) {
         if (!isValidObjectId(writer)) return res.json({ error: "Invalid Writer " });
      }
      newMovie.writers = writers;
   }

   // Uploading Poster
   if (file) {
      const { secure_url, public_id, responsive_breakpoints } = await cloudinary.uploader.upload(
         file.path,
         {
            transformation: {
               width: 1280,
               height: 720,
            },
            responsive_breakpoints: {
               create_derived: true,
               max_width: 640,
               max_images: 3,
            },
         }
      );
      // creating poster object for pushing inside DB
      const poster = { url: secure_url, public_id, responsiveImages: [] };
      const breakpoints = responsive_breakpoints[0];
      if (breakpoints.length) {
         // extracting single images from breakpoint array and pushing it into DB
         for (let img of breakpoints) {
            const { secure_url } = img;
            poster.responsiveImages.push(secure_url);
         }
      }

      newMovie.poster = poster;
   }

   const savedMovie = await newMovie.save();

   res.status(201).json({
      data: {
         id: savedMovie._id,
         title: savedMovie.title,
      },
   });
};

const updateMovieWithoutPoster = async (req, res) => {
   const { body } = req;

   if (!isValidObjectId(req.params.movieId)) return res.json({ error: "Movie id not Found" });
   const movie = await Movie.findById(req.params.movieId);
   // checking if movie exists inside DB
   if (!movie) return res.status(404).json({ error: "Movie Not found inside Database" });

   const {
      title, // "some title" //*
      storyLine, // "Some description" //*
      director, // "Some name"
      releaseDate, // "07-12-2009" //*
      status, // "private" //*
      type, // "movie" //*
      genres, // ["Sci-fi", "Action","Adventure"] //*
      tags, // ["action","movie","hollywood"] //*
      cast, // [{actor:"sds1212sdf",roleAs:"John Doe",leadActor:true}] //*
      writers, // ['12121','asd231]
      trailer, // {url:'https:://', public_id:"sdsdqw1212"} //*
      language, // "english" //*
   } = body;

   movie.title = title;
   movie.storyLine = storyLine;
   movie.releaseDate = releaseDate;
   movie.status = status;
   movie.type = type;
   movie.genres = genres;
   movie.tags = tags;
   movie.cast = cast;
   movie.language = language;
   movie.trailer = trailer;

   // director and writers are optional fields hence, explicit checking
   if (director) {
      if (!isValidObjectId(director)) return res.json({ error: "Invalid Director Id" });
      movie.director = director;
   }
   if (writers) {
      for (let writer of writers) {
         if (!isValidObjectId(writer)) return res.json({ error: "Invalid Writer " });
      }
      movie.writers = writers;
   }

   const updatedMovie = await movie.save();

   res.json({ msg: "Movie Updated Successfully", data: updatedMovie });
};

const updateMovieWithPoster = async (req, res) => {
   const { body, file } = req;

   if (!file) return res.json({ error: "Movie Poster file is missing" });

   if (!isValidObjectId(req.params.movieId)) return res.json({ error: "Movie id not Found" });
   const movie = await Movie.findById(req.params.movieId);
   // checking if movie exists inside DB
   if (!movie) return res.status(404).json({ error: "Movie Not found inside Database" });

   const {
      title, // "some title" //*
      storyLine, // "Some description" //*
      director, // "Some name"
      releaseDate, // "07-12-2009" //*
      status, // "private" //*
      type, // "movie" //*
      genres, // ["Sci-fi", "Action","Adventure"] //*
      tags, // ["action","movie","hollywood"] //*
      cast, // [{actor:"sds1212sdf",roleAs:"John Doe",leadActor:true}] //*
      writers, // ['12121','asd231]
      trailer, // {url:'https:://', public_id:"sdsdqw1212"} //*
      language, // "english" //*
   } = body;

   movie.title = title;
   movie.storyLine = storyLine;
   movie.releaseDate = releaseDate;
   movie.status = status;
   movie.type = type;
   movie.genres = genres;
   movie.tags = tags;
   movie.cast = cast;
   movie.language = language;
   movie.trailer = trailer;

   // director and writers are optional fields hence, explicit checking
   if (director) {
      if (!isValidObjectId(director)) return res.json({ error: "Invalid Director Id" });
      movie.director = director;
   }
   if (writers) {
      for (let writer of writers) {
         if (!isValidObjectId(writer)) return res.json({ error: "Invalid Writer " });
      }
      movie.writers = writers;
   }

   // update POSTER
   // removing poster from cloudinary if there is any
   if (movie.poster?.public_id) {
      const { result } = await cloudinary.uploader.destroy(movie.poster?.public_id);
      if (result !== "ok") {
         res.json({ error: "Could not delete poster from Cloud" });
      }
   }
   // upload new poster inside cloud storage
   const { secure_url, public_id, responsive_breakpoints } = await cloudinary.uploader.upload(
      file.path,
      {
         transformation: {
            width: 1280,
            height: 720,
         },
         responsive_breakpoints: {
            create_derived: true,
            max_width: 640,
            max_images: 3,
         },
      }
   );
   // creating poster object for pushing inside DB
   const finalPoster = { url: secure_url, public_id, responsiveImages: [] };
   const breakpoints = responsive_breakpoints[0];
   if (breakpoints.length) {
      // extracting single images from breakpoint array and pushing it into DB
      for (let img of breakpoints) {
         const { secure_url } = img;
         poster.responsiveImages.push(secure_url);
      }
   }

   movie.poster = finalPoster;
   const updatedMovie = await movie.save();

   res.json({ msg: "Movie Updated Successfully", data: updatedMovie });
};

const removeMovie = async (req, res) => {
   const { movieId } = req.params;
   if (!isValidObjectId(movieId)) return res.json({ error: "Movie id not Found" });

   const movie = await Movie.findById(movieId);
   //check if the movie exists inside the DB
   if (!movie) return res.status(404).json({ error: "Movie Not found inside Database" });

   // removing poster from cloudinary if there is any
   const posterId = movie.poster?.public_id;
   if (posterId) {
      const { result } = await cloudinary.uploader.destroy(posterId);
      if (result !== "ok") {
         res.json({ error: "Could not delete poster from Cloud" });
      }
   }
   // removing Video Trailer from cloudinary if there is any
   const trailerId = movie.trailer?.public_id;
   if (!trailerId) {
      return res.status(404).json({ error: "Movie Trailer public_id Not found inside Cloud" });
   }
   const { result } = await cloudinary.uploader.destroy(trailerId, { resource_type: "video" });
   if (result !== "ok") {
      res.json({ error: "Could not delete trailer from Cloud" });
   }
   // removing movie data from Mongo db
   await Movie.findByIdAndDelete(movieId);
   res.status(201).json({ msg: "Movie Removed from the Database !" });
};

// get Paginated Movies @GET
const getPaginatedMovies = async (req, res) => {
  let { pageNo, limit } = req.query;

  // Convert pageNo and limit to numbers and set defaults if not provided
  pageNo = parseInt(pageNo) || 0; // Default to 0 if pageNo is invalid
  limit = parseInt(limit) || 10; // Default to 10 if limit is invalid

  // Ensure pageNo and limit are non-negative
  if (pageNo < 0) pageNo = 0;
  if (limit < 1) limit = 10;

  // Calculate skip value based on pageNo and limit
  const skip = pageNo * limit;

  try {
    const movies = await Movie.find({})
      .sort({ createdAt: "-1" })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ data: { movies } });
  } catch (err) {
    console.error("Error fetching movies:", err);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
};


// fetch movie data to auto-fill the form for updation //! on HOLD
const methodToPrefillUpdateMovieForm = async (req, res) => {
   const { movieId } = req.params;
   if (!isValidObjectId(movieId)) return res.json({ error: "Movie id not Found" });

   const movie = await Movie.findById(movieId).populate("director writers cast.actor");
   //check if the movie exists inside the DB
   if (!movie) return res.status(404).json({ error: "Movie Not found inside Database" });

   const formatActor = (actor) => {
      const { _id, name, gender, avatar, description } = actor;
      return {
         _id,
         name,
         gender,
         description,
         avatar: avatar,
      };
   };
   res.json({
      data: {
         id: movie._id,
         title: movie.title,
         storyLine: movie.storyLine,
         poster: movie.poster,
         releaseDate: movie.releaseDate,
         status: movie.status,
         type: movie.type,
         language: movie.language,
         genres: movie.genres,
         tags: movie.tags,
         director: formatActor(movie.director),
         writers: movie.writers.map((w) => formatActor(w)),
         cast: movie.cast.map((c) => {
            return {
               _id: c._id,
               profile: formatActor(c.actor),
               roleAs: c.roleAs,
               leadActor: c.leadActor,
            };
         }),
      },
   });
};

// SEARCH movie (admin ) @GET
const searchMovies = async (req, res) => {
   const { title } = req.query;
   if (!title) return res.json({ error: "Search Field cannot be empty" });
   const results = await Movie.find({ title: { $regex: title, $options: "i" } });
   res.status(200).json({ data: results });
};

module.exports = {
   uploadTrailer,
   createMovie,
   updateMovieWithoutPoster,
   updateMovieWithPoster,
   removeMovie,
   getPaginatedMovies,
   methodToPrefillUpdateMovieForm,
   searchMovies,
};
