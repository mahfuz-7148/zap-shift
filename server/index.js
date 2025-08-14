require('dotenv').config();
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-adminsdk-fbsvc-c2bda2cff0.json");
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const express = require('express');
const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
app.use(cors())
app.use(express.json())

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@lost-found.mmu9lkl.mongodb.net/?retryWrites=true&w=majority&appName=lost-found`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();

        const parcelCollection = client.db('parcelDB').collection('parcels')
        const paymentsCollection = client.db('parcelDB').collection('payments')
        const usersCollection = client.db('parcelDB').collection('users');
        const ridersCollection = client.db('parcelDB').collection('riders');

        const verifyFBToken = async (req, res, next) => {
            const authHeader = req.headers.authorization
            // console.log(authHeader)
            if (!authHeader) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = authHeader.split(' ')[1]
            if (!token){
                return res.status(401).send({ message: 'unauthorized access' })
            }

            try {
                const decoded = await admin.auth().verifyIdToken(token)
                req.decoded = decoded
                next()
            }
            catch (error) {
                return res.status(403).send({ message: 'forbidden access' })
            }
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.post('/users', async (req, res) => {
            const email = req.body.email;
            const userExists = await usersCollection.findOne({ email })
            if (userExists) {
                // update last log in
                return res.status(200).send({ message: 'User already exists', inserted: false });
            }
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users/search', async (req, res) => {
            const emailQuery = req.query.email
            const regex = new RegExp(emailQuery, 'i')
            try {
                const users = await usersCollection.find({
                    email: {
                        $regex: regex
                    }
                }).limit(10).toArray()
                res.send(users)
            }
            catch (error) {
                console.error('Error getting user role:', error);
                res.status(500).send({ message: 'Failed to get role' });
            }
        })

        app.get('/users/:email/role', async (req, res) => {
            try {
                const email = req.params.email;

                if (!email) {
                    return res.status(400).send({ message: 'Email is required' });
                }

                const user = await usersCollection.findOne({ email });

                if (!user) {
                    return res.status(404).send({ message: 'User not found' });
                }

                res.send({ role: user.role || 'user' });
            } catch (error) {
                console.error('Error getting user role:', error);
                res.status(500).send({ message: 'Failed to get role' });
            }
        });


        app.patch("/users/:id/role", verifyFBToken, verifyAdmin, async (req, res) => {
            const { id } = req.params;
            const { role } = req.body;

            if (!["admin", "user"].includes(role)) {
                return res.status(400).send({ message: "Invalid role" });
            }

            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role } }
                );
                res.send({ message: `User role updated to ${role}`, result });
            } catch (error) {
                console.error("Error updating user role", error);
                res.status(500).send({ message: "Failed to update user role" });
            }
        });


        app.get('/parcels', verifyFBToken, async (req, res) => {
            try {
                const {email, payment_status, delivery_status} = req.query;
                // console.log(req.decoded)
                let query = {}
                if (email) {
                    query = {
                        created_by: email
                    }
                }
                if (payment_status) {
                    query.payment_status = payment_status
                }
                if (delivery_status) {
                    query.delivery_status = delivery_status
                }

                const options = {
                    sort: { creation_date: -1 }
                };

                // console.log('parcel query', req.query, query)

                const parcels = await parcelCollection.find(query, options).toArray();
                res.send(parcels);
            } catch (error) {
                console.error('Error fetching parcels:', error);
                res.status(500).send({ message: 'Failed to get parcels' });
            }
        });


        app.post('/parcels', async (req, res) => {
            try {
                const newParcel = req.body;
                const result = await parcelCollection.insertOne(newParcel);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error inserting parcel:', error);
                res.status(500).send({ message: 'Failed to create parcel' });
            }
        });



        app.get('/parcels/:id', async (req, res) => {
            const id = req.params.id;
            const parcel = await parcelCollection.findOne({
                _id: new ObjectId(id)
            })
            res.send(parcel)
        })
        app.patch('/parcels/:id/assign', async (req, res) => {
            const parcelId = req.params.id
            const {riderId, riderName, riderEmail} = req.body
            // console.log(riderId, riderName)
            const filter =  { _id: new ObjectId(parcelId) }
            const updateDoc = {
                $set: {
                    delivery_status: "rider_assigned",
                    assigned_rider_id: riderId,
                    assigned_rider_email: riderEmail,
                    assigned_rider_name: riderName,
                }
            }
            const filter1 =  { _id: new ObjectId(riderId) }
            const updateDoc1 = {
                $set: {
                    work_status: "in_delivery",
                }
            }
            try {
                await  parcelCollection.updateOne(filter, updateDoc)
                await ridersCollection.updateOne(filter1, updateDoc1)
                res.send({message: 'Rider assigned'})
            }
            catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to assign rider" });
            }
        })

        app.get('/rider/parcels', async (req, res) => {
            try {
                const email = req.query.email
                if (!email) {
                    return res.status(400).send({ message: 'Rider email is required' });
                }
                const filter = {
                    assigned_rider_email: email,
                    delivery_status: {
                        $in: ['rider_assigned', 'in_transit']
                    }
                    }
                    const options = {
                        sort: {
                            creation_date: -1
                        }
                }
                const parcels = await parcelCollection.find(filter,options).toArray()
                res.send(parcels)
            }
            catch (error) {
                console.error('Error fetching rider tasks:', error);
                res.status(500).send({ message: 'Failed to get rider tasks' });
            }
        })

        app.patch('/parcels/:id/status', async (req, res) => {
            const parcelId = req.params.id
            const {status} = req.body
            const updateDoc = {
                delivery_status: status
            }
            if (status === 'rider_assigned') {
                updateDoc.picked_at = new Date().toISOString()
            }
            else if (status === 'delivered') {
                updateDoc.delivered_at = new Date().toISOString()
            }
            try {
                const result = await parcelCollection.updateOne({
                    _id: new ObjectId(parcelId)
                },
                {
                    $set: updateDoc
                }
            )
                res.send(result)
            }catch (error) {
                res.status(500).send({ message: "Failed to update status" });
            }
        })

        app.delete('/parcels/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });

                res.send(result);
            } catch (error) {
                console.error('Error deleting parcel:', error);
                res.status(500).send({ message: 'Failed to delete parcel' });
            }
        });

        app.get('/payments', async (req, res) => {
            try {
                const userEmail = req.query.email;

                const query = userEmail ? { email: userEmail } : {};
                const options = { sort: { paid_at_string: -1 } }; // Latest first

                const payments = await paymentsCollection.find(query, options).toArray();
                res.send(payments);
            } catch (error) {
                console.error('Error fetching payment history:', error);
                res.status(500).send({ message: 'Failed to get payments' });
            }
        });


        app.post('/payments', async (req, res) => {
            try {
                const {parcelId, email, amount, paymentMethod, transactionId} = req.body
                const updateResult = await parcelCollection.updateOne(
                    { _id: new ObjectId(parcelId) },
                    {
                        $set: {
                            payment_status: 'paid'
                        }
                    }
                );

                if (updateResult.modifiedCount === 0) {
                    return res.status(404).send({ message: 'Parcel not found or already paid' });
                }
                const paymentDoc = {
                    parcelId,
                    email,
                    amount,
                    paymentMethod,
                    transactionId,
                    paid_at_string: new Date().toISOString(),
                    paid_at: new Date()
                }
                const paymentResult = await paymentsCollection.insertOne(paymentDoc)
                res.status(201).send({
                    message: 'Payment recorded and parcel marked as paid',
                    insertedId: paymentResult.insertedId,
                });
            }
            catch (error) {
                console.error('Payment processing failed:', error);
                res.status(500).send({ message: 'Failed to record payment' });
            }
        })

        app.post('/riders', async (req, res) => {
            const rider = req.body;
            const result = await ridersCollection.insertOne(rider);
            res.send(result);
        })

        app.get("/riders/pending", verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const pendingRiders = await ridersCollection
                    .find({ status: "pending" })
                    .toArray();
                res.send(pendingRiders);
            } catch (error) {
                console.error("Failed to load pending riders:", error);
                res.status(500).send({ message: "Failed to load pending riders" });
            }
        });

        app.get("/riders/active", verifyFBToken, verifyAdmin, async (req, res) => {
            const filter = {
                status: "active"
            }
            const result = await ridersCollection.find(filter).toArray();
            res.send(result);
        });

        app.get('/riders/available', async (req, res) => {
            const {district} = req.query
            try {
                const riders = await ridersCollection.find({district}).toArray()
                res.send(riders)
            }
            catch (error) {
                res.status(500).send({ message: "Failed to load riders" });
            }
        })


        app.patch("/riders/:id/status", async (req, res) => {
            const { id } = req.params;
            const { status, email } = req.body;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set:
                    {
                        status
                    }
            }

            try {
                const result = await ridersCollection.updateOne(
                    query, updateDoc
                );

                if (status === 'active'){
                    const useQuery = {email}
                    const userUpdateDoc = {
                        $set:
                            {
                                role: 'rider'
                            }
                    }
                    const roleResult = await usersCollection.updateOne(useQuery, userUpdateDoc)
                    console.log(roleResult.modifiedCount)

                }
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to update rider status" });
            }
        });


        app.post('/create-payment-intent', async (req, res) => {
            const {amountInCents} = req.body
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountInCents,
                    currency: 'usd',
                    payment_method_types: ['card'],
                })
                res.send({
                    clientSecret: paymentIntent.client_secret
                })
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        })

        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});