// models/TicketPurchase.js
import mongoose from 'mongoose';

const ticketPurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, required: true },
  quantity: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  qrCode: { type: String },  // Store QR code data URI here
});

export default mongoose.model('TicketPurchase', ticketPurchaseSchema);
