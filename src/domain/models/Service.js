import mongoose from 'mongoose';

const AddonSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
}, { _id: false });

const AvailabilitySchema = new mongoose.Schema({
  type: { type: String, enum: ['calendar', 'weekly'], required: true },
  dates: [{ type: Date }],
  weeklySchedule: {
    monday: Boolean,
    tuesday: Boolean,
    wednesday: Boolean,
    thursday: Boolean,
    friday: Boolean,
    saturday: Boolean,
    sunday: Boolean,
  },
}, { _id: false });




const LocationAvailableSchema = new mongoose.Schema({
  cities: [String],
  outOfCityCharges: { type: Number, default: 0 },
}, { _id: false });

const ServiceSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },

  basePrice: { type: Number, required: true },
  pricingType: { type: String, enum: ['per_event', 'per_hour', 'per_day'], required: true },
  pricingMode: { type: String, enum: ['fixed', 'negotiable'], required: true },

  availability: AvailabilitySchema,
  addons: [AddonSchema],
  images: [String],

  inclusions: [String],
  exclusions: [String],
  
  // ✅ Inlined settings
settings: {
  type: new mongoose.Schema({
    liveStatus: { type: Boolean, default: false },
    maxConcurrentBookings: { type: Number ,default: 1 },
    maxBookingsPerDay: { type: Number,default: 1 },  
    allowReshare: { type: Boolean, default: true },
  }, { _id: false }), // Don't generate _id for sub-schema
  default: {}
},

 ratings: {
  type: new mongoose.Schema({
    avgRating: { type: Number, default: 0 },
    userRatings: {
      type: Map,
      of: Number, // rating value
      default: {},
    },
  }, { _id: false }),
  default: {},
},

  setupTimeBufferHours: { type: Number },
  maxBookingsPerDay: { type: Number },

  locationAvailable: LocationAvailableSchema,

  cancellationPolicy: { type: String },
  termsAndConditions: { type: String },

  customTags: [String],

  isPublished: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ServiceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Service', ServiceSchema);
