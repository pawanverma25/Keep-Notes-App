import express from "express";
import { db, connectionToDB } from "./db.js";
import admin from "firebase-admin";
import path from "path";
import "dotenv/config";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentials = {
	type: process.env.FIREBASE_TYPE,
	project_id: process.env.FIREBASE_PROJECT_ID,
	private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
	private_key: process.env.FIREBASE_PRIVATE_KEY,
	client_email: process.env.FIREBASE_CLIENT_EMAIL,
	client_id: process.env.FIREBASE_CLIENT_ID,
	auth_uri: process.env.FIREBASE_AUTH_URI,
	token_uri: process.env.FIREBASE_TOKEN_URI,
	auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
	client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
	credential: admin.credential.cert(credentials),
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "./build")));

app.use(cors());

app.get(/^(?!\/api).+/, (req, res) => {
	res.sendFile(path.join(__dirname, "./build/index.html"));
});

app.use(async (req, res, next) => {
	const { authtoken } = req.headers;
	if (authtoken) {
		try {
			const { uid } = await admin.auth().verifyIdToken(authtoken);
			req.user = await admin.auth().getUser(uid);
		} catch (e) {
			return res.sendStatus(400);
		}
	}
	req.user = req.user || {};
	next();
});

app.get("/api/notes", async (req, res) => {
	if (req.user !== {}) {
		const userData = await db
			.collection("notes")
			.findOne({ email: req.user.email });
		if (userData) {
			res.send(userData.notes);
			return;
		} else {
			db.collection("notes").insertOne({
				email: req.user.email,
				name: req.user.displayName,
				notes: [],
			});
		}
	}
	res.send([]);
	res.end();
});

app.use((req, res, next) => {
	if (req.user) next();
	else res.sendStatus(401);
});

app.put("/api/change", async (req, res) => {
	const notes = req.body;
	await db.collection("notes").updateOne(
		{ email: req.user.email },
		{
			$set: { notes: notes },
		}
	);
	res.sendStatus(200);
	res.end();
});

app.get("/api/user/change", async (req, res) => {
	await db.collection("notes").updateOne(
		{ email: req.user.email },
		{
			$set: { name: req.user.displayName },
		}
	);
	res.end();
});

app.get("/api/user/del", async (req, res) => {
	await db.collection("notes").deleteOne({ email: req.user.email });
	res.end();
});

const PORT = process.env.PORT || 8000;

connectionToDB(() => {
	console.log("successfully connected to databases");
	app.listen(PORT, () => {
		console.log("server is listening on port " + PORT);
	});
});
