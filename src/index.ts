import axios from 'axios';
import mongoose from 'mongoose';
import { scheduleJob } from 'node-schedule';
import 'dotenv/config';

interface ActionDocument extends mongoose.Document {
  trx_id: string;
  block_time: string;
  block_num: number;
}

const actionSchema = new mongoose.Schema({
  trx_id: { type: String, unique: true, required: true },
  block_time: { type: String, required: true },
  block_num: { type: Number, required: true },
});

const Action = mongoose.model<ActionDocument>('Action', actionSchema);

const fetchAndSaveActions = async () => {
  try {
    const response = await axios.post('https://eos.greymass.com/v1/history/get_actions', {
      account_name: 'eosio',
      pos: -1,
      offset: -100,
    });

    const actions = response.data.actions;
    for (const action of actions) {
      const { trx_id, block_time, block_num } = action.action_trace;
      const newAction = new Action({ trx_id, block_time, block_num });

      await newAction.save().catch(err => {
        if (err.code !== 11000) {
          console.error('Error saving action:', err);
        }
      });
    }
  } catch (error) {
    console.error('Error fetching actions:', error);
  }
};

scheduleJob('*/1 * * * *', fetchAndSaveActions);

const start = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in the environment variables');
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

start();
