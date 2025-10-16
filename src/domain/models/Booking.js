import mongoose from 'mongoose';


const BookingSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  selectedDates: [{ type: Date, required: true }],
  addons: [{ type: String }], // addon IDs

  inquiryMessage: { type: String },

  priceOfferedByAdmin: { type: Number },
  counterOfferByUser: { type: Number },

  finalPrice: { type: Number },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  status: {
  type: String,
  enum: ['pending', 'accepted', 'rejected', 'countered', 'confirmed', 'cancelled'],
  default: 'pending'
},
finalPrice: { type: Number },
adminMessage: { type: String }, // Optional message from admin
userResponse: {
  accepted: Boolean,
  counterOffer: Number,
  message: String
},
paymentDone: { type: Boolean, default: false }
,

  isNegotiable: { type: Boolean, default: false },

  adminRemarks: { type: String },
  userRemarks: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', BookingSchema);
export default Booking;
