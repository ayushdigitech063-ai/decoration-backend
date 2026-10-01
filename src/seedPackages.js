const mongoose = require('mongoose');
const Package = require('./models/Package');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' }); // Load .env from backend/.env if run from src, but let's just hardcode the URI for a quick script

const MONGO_URI = 'mongodb+srv://ayushdigitech063_db_user:Zhz5qJ98ODluLeB1@cluster0.gvpex98.mongodb.net/?appName=Cluster0';

const seedPackages = [
  {
    name: "Classic Wall Arch",
    description: "Elegant and neat wall balloon styling, perfect for compact spaces.",
    price: 2999,
    image: "/walldecoration.png",
    pageTarget: "wall-decoration",
    isPopular: false,
    features: [
      "Half/Full Wall Balloon Arch",
      "Matching Foil Curtains & Banners",
      "Easy peel-off safe wall hooks",
      "Professional installation team",
      "Duration: 2-3 Hours Setup"
    ]
  },
  {
    name: "Floral & Ring Wall Decor",
    description: "Stunning combination of floral loops, fairy lights, and themed wall accents.",
    price: 5499,
    image: "/walldecoration1.png",
    pageTarget: "wall-decoration",
    isPopular: true,
    features: [
      "Everything in Classic Wall Arch",
      "Metal/Wooden Ring Backdrop Setup",
      "LED Neon Sign / Custom Name Cutout",
      "Fairy lights & ambient lighting",
      "Premium organic biodegradable balloons"
    ]
  },
  {
    name: "Grand Entrance & Wall Combo",
    description: "Complete wall and door decoration bundle for maximum visual impact.",
    price: 8999,
    image: "/doordecoration.png",
    pageTarget: "wall-decoration",
    isPopular: false,
    features: [
      "Comprehensive Wall Decoration",
      "Matching Door Entrance Styling",
      "Special Photo-Booth Corner",
      "Fog or Cold Pyro entry elements",
      "Dedicated event stylist support"
    ]
  }
];

const runSeed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");
    
    // Optional: Clear existing packages for wall-decoration to prevent duplicates
    await Package.deleteMany({ pageTarget: "wall-decoration" });
    console.log("Cleared old wall-decoration packages...");

    await Package.insertMany(seedPackages);
    console.log("Successfully seeded packages!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding packages:", error);
    process.exit(1);
  }
};

runSeed();
