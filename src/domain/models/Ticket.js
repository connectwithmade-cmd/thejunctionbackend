// models/Ticket.js
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  quantity: { type: Number, required: true },
  sold: { type: Number, default: 0 },
  termsAndConditions: { type: String, default: '' },
  lastDateForRefund: { type: Date },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  published:{ type: Boolean, default: true },

}, { _id: true }); // still embedded schema, not a model

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
