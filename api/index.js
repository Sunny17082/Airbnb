const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const download = require("image-downloader");
const multer = require("multer");
const User = require("./models/user");
const Place = require("./models/place");
const Booking = require("./models/booking")
const cookieParser = require("cookie-parser");
const fs = require("fs");
const app = express();

const PORT = process.env.PORT;

// generating salt after 10 iteration
const bcryptSalt = bcrypt.genSaltSync(10);

const secret = process.env.SECRET;

// parse incoming requests with JSON payloads
app.use(express.json());

// parses cookies attached to the client's request and makes them available in the req.cookies object.
app.use(cookieParser());

app.use("/uploads", express.static(__dirname + "/uploads"));

//  It allows requests from http://localhost:5173 to access the server, including credentials in the requests
app.use(
	cors({
		credentials: true,
		origin: "http://localhost:5173",
	})
);

// connecting the database
mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("Connection successful..."))
	.catch((err) => console.log(err));

function getUserDataFromReq(req) {
	return new Promise((resolve, reject) => {
		jwt.verify(req.cookies.token, secret, {}, async (err, userData) => {
			if (err) throw err;
			resolve(userData);
		});
	});
}

app.post("/register", async (req, res) => {
	const { name, email, password } = req.body;
	try {
		const userDoc = await User.create({
			name,
			email,
			// This function takes the plaintext password and the generated salt (bcryptSalt) and produces a securely hashed version of the password
			password: bcrypt.hashSync(password, bcryptSalt),
		});
		res.json(userDoc);
	} catch (err) {
		res.status(422).json(err);
	}
});

app.post("/login", async (req, res) => {
	const { email, password } = req.body;
	const userDoc = await User.findOne({
		email,
	});
	if (userDoc) {
		// synchronously compare a plaintext password with a stored hashed password
		const passOk = bcrypt.compareSync(password, userDoc.password);
		if (passOk) {
			// generate a JWT and then setting it as a cookie in a response.
			jwt.sign(
				{ email: userDoc.email, id: userDoc._id }, // Payload
				secret, // Secret key for signing the token
				{}, // Options
				(err, token) => {
					// Callback function
					if (err) throw err;
					res.cookie("token", token).json(userDoc);
				}
			);
		} else {
			res.status(422).json("Password not ok");
		}
	} else {
		res.status(404).json("not found");
	}
});

app.get("/profile", (req, res) => {
	const { token } = req.cookies;
	if (token) {
		// to verify the token and send user data to client
		jwt.verify(token, secret, {}, async (err, userData) => {
			if (err) throw err;
			const { name, email, _id } = await User.findById(userData.id);
			res.json({ name, email, _id });
		});
	} else {
		res.json(null);
	}
});

app.post("/logout", (req, res) => {
	res.cookie("token", "").json(true);
});

app.post("/upload-by-link", async (req, res) => {
	const { link } = req.body;

	const newName = "img" + Date.now() + ".png";
	const options = {
		url: link,
		dest: __dirname + "/uploads/" + newName,
	};
	try {
		await download.image(options);
		res.json(newName);
	} catch (err) {
		console.log(err);
	}
});

const photoMiddleware = multer({ dest: "uploads/" });

app.post("/upload", photoMiddleware.array("photos", 10), (req, res) => {
	const uploadedFiles = [];
	for (let i = 0; i < req.files.length; i++) {
		const { path, originalname } = req.files[i];
		const parts = originalname.split("/");
		const ext = parts[parts.length - 1];
		const newPath = path + "." + ext;
		fs.renameSync(path, newPath);
		uploadedFiles.push(newPath.replace("uploads", ""));
	}
	res.json(uploadedFiles);
});

app.post("/places", (req, res) => {
	const { token } = req.cookies;
	const {
		title,
		address,
		addedPhotos,
		description,
		perks,
		extraInfo,
		checkIn,
		checkOut,
		maxGuests,
		price,
	} = req.body;

	jwt.verify(token, secret, {}, async (err, userData) => {
		if (err) throw err;
		const placeDoc = await Place.create({
			owner: userData.id,
			title,
			address,
			photos: addedPhotos,
			description,
			perks,
			extraInfo,
			checkIn,
			checkOut,
			maxGuests,
			price,
		});
		res.json(placeDoc);
	});
});

app.get("/user-places", (req, res) => {
	const { token } = req.cookies;

	jwt.verify(token, secret, {}, async (err, userData) => {
		if (err) throw err;
		const { id } = userData;
		res.json(await Place.find({ owner: id }));
	});
});

app.get("/places/:id", async (req, res) => {
	const { id } = req.params;
	res.json(await Place.findById(id));
});

app.put("/places", (req, res) => {
	const { token } = req.cookies;
	const {
		id,
		title,
		address,
		addedPhotos,
		description,
		perks,
		extraInfo,
		checkIn,
		checkOut,
		maxGuests,
		price,
	} = req.body;

	jwt.verify(token, secret, {}, async (err, userData) => {
		if (err) throw err;
		const placeDoc = await Place.findById(id);
		if (userData.id === placeDoc.owner.toString()) {
			placeDoc.set({
				title,
				address,
				photos: addedPhotos,
				description,
				perks,
				extraInfo,
				checkIn,
				checkOut,
				maxGuests,
				price,
			});
			await placeDoc.save();
			res.json(placeDoc);
		}
	});
});

app.get("/places", async (req, res) => {
	const placeDoc = await Place.find();
	res.json(placeDoc);
});

app.get("/place/:id", async (req, res) => {
	const { id } = req.params;
	res.json(await Place.findById(id));
});

app.post("/bookings", async (req, res) => {
	const userData = await getUserDataFromReq(req);
	const { place, checkIn, checkOut, numberOfGuests, name, phone, price } = req.body;
	Booking.create({
		place,
		checkIn,
		checkOut,
		numberOfGuests,
		name,
		phone,
		price,
		user: userData.id
	}).then((doc) => {
		res.status(200).json(doc);
	}).catch((err) => {
		res.status(400).json(err);
	});
});

app.get("/bookings", async (req, res) => {
	const userData = await getUserDataFromReq(req);
	res.json(await Booking.find({user:userData.id}).populate("place"));
})

app.listen(PORT, () => {
	console.log("Server started on port 5000...");
});
