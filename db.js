import { MongoClient } from "mongodb";

let db;

async function connectionToDB(cb) {
	const client = new MongoClient(
		`mongodb+srv://pawanverma:${process.env.MONGO_PASSWORD}@cluster0.skybvk0.mongodb.net/?retryWrites=true&w=majority`
	);
	await client.connect();
	db = client.db("notes-db");
	cb();
}

export { db, connectionToDB };
