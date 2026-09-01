const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');

// Load environment variables
dotenv.config();

const SEED_DEPARTMENTS = [
  { name: 'Roads Department', description: 'Handles road repairs, potholes, and construction' },
  { name: 'Electricity Department', description: 'Manages grid power, lines, meters, and street lights' },
  { name: 'Water Department', description: 'Manages water supply quality, pipeline leaks, and distribution' },
  { name: 'Sanitation Department', description: 'Manages garbage collection, street sweeping, and hygiene' },
  { name: 'Drainage Department', description: 'Manages sewage lines, clogged gutters, and drainage overflow' },
  { name: 'General Administration Department', description: 'Default category routing and admin logs' }
];

const SEED_COMPLAINT_TEMPLATES = [
  // Roads
  {
    title: 'Huge potholes on Main Market Road',
    description: 'There are major potholes near the metro station causing serious traffic delays and minor accidents daily.',
    category: 'Roads',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Mumbai, Maharashtra',
    status: 'IN_PROGRESS'
  },
  {
    title: 'Water clogging on flyover underpass',
    description: 'Water has collected in the underpass since yesterday. Cars are getting stuck and it is very risky.',
    category: 'Roads',
    priority: 'CRITICAL',
    sentiment: 'NEGATIVE',
    location: 'Delhi, Connaught Place',
    status: 'ASSIGNED'
  },
  {
    title: 'Broken safety barriers near school',
    description: 'The iron barricades on the sidewalk near St. Joseph School are broken and hanging, which is dangerous for kids.',
    category: 'Roads',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Bangalore, Indiranagar',
    status: 'RESOLVED',
    resolutionNotes: 'Barriers replaced and sidebar repainted.',
    resolvedDaysAgo: 5
  },
  {
    title: 'Road tar peeling off',
    description: 'The newly constructed road in Sector 12 is already peeling off after 2 days of rain.',
    category: 'Roads',
    priority: 'MEDIUM',
    sentiment: 'NEGATIVE',
    location: 'Ahmedabad, Satellite Area',
    status: 'SUBMITTED'
  },
  
  // Electricity
  {
    title: 'Hanging high-voltage wire',
    description: 'A live power line is dangling from the pole near Block C park. Children play there, immediate attention required!',
    category: 'Electricity',
    priority: 'CRITICAL',
    sentiment: 'NEGATIVE',
    location: 'Hyderabad, Gachibowli',
    status: 'RESOLVED',
    resolutionNotes: 'Power isolated, wire replaced and secured high up on poles.',
    resolvedDaysAgo: 2
  },
  {
    title: 'Frequent voltage fluctuations',
    description: 'Voltage goes extremely high and low, burning down home appliances like refrigerators and AC units.',
    category: 'Electricity',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Pune, Hinjewadi',
    status: 'IN_PROGRESS'
  },
  {
    title: 'Smart meter billing issue',
    description: 'Received a bill of 45,000 INR, which is physically impossible for a 2-room flat. Meter seems faulty.',
    category: 'Electricity',
    priority: 'LOW',
    sentiment: 'NEGATIVE',
    location: 'Chennai, Adyar',
    status: 'SUBMITTED'
  },
  {
    title: 'Frequent power cuts',
    description: 'Power cut of 4 hours daily in Sector 4 without any prior schedule or notice.',
    category: 'Electricity',
    priority: 'MEDIUM',
    sentiment: 'NEGATIVE',
    location: 'Kolkata, Salt Lake',
    status: 'RESOLVED',
    resolutionNotes: 'Transformer line corrected and grid maintenance complete.',
    resolvedDaysAgo: 10
  },

  // Street Light
  {
    title: 'Street lights off for 3 days',
    description: 'Street light near the main market has not been working for three days. The road is completely dark and unsafe at night.',
    category: 'Street Light',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Delhi, Dwarka Sector 6',
    status: 'RESOLVED',
    resolutionNotes: 'Replaced 4 LED bulbs on the main market road and cleaned light poles.',
    resolvedDaysAgo: 1
  },
  {
    title: 'Street light blinking constantly',
    description: 'The street light right outside my house is blinking like a disco light. It is causing headaches.',
    category: 'Street Light',
    priority: 'LOW',
    sentiment: 'NEUTRAL',
    location: 'Mumbai, Bandra West',
    status: 'IN_PROGRESS'
  },
  
  // Water
  {
    title: 'Drinking water has strong chemical smell',
    description: 'The municipal water supply smells strongly of chemicals or bleaching powder since this morning. Unfit to drink.',
    category: 'Water Supply',
    priority: 'CRITICAL',
    sentiment: 'NEGATIVE',
    location: 'Delhi, Dwarka Sector 10',
    status: 'ASSIGNED'
  },
  {
    title: 'Major main line pipe leak',
    description: 'Gallons of clean drinking water are wasting due to a massive fracture in the main supply pipe under the road.',
    category: 'Water Supply',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Bangalore, Koramangala',
    status: 'IN_PROGRESS'
  },
  {
    title: 'No water supply in block D',
    description: 'We have not received water in our taps for the last 48 hours. Please supply water tankers.',
    category: 'Water Supply',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Jaipur, Malviya Nagar',
    status: 'RESOLVED',
    resolutionNotes: 'Pipeline air-lock removed. Normal supply restored.',
    resolvedDaysAgo: 8
  },
  {
    title: 'Muddy water supply',
    description: 'Muddy brown water coming from taps. Kids are getting stomach issues.',
    category: 'Water Supply',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Lucknow, Gomti Nagar',
    status: 'SUBMITTED'
  },

  // Sanitation/Garbage
  {
    title: 'Garbage dump pile blocking sidewalk',
    description: 'Garbage trucks haven not cleaned the collection bin in 5 days. It has spilled onto the road and smells awful.',
    category: 'Sanitation',
    priority: 'MEDIUM',
    sentiment: 'NEGATIVE',
    location: 'Mumbai, Andheri East',
    status: 'RESOLVED',
    resolutionNotes: 'Cleared the garbage bin, sprayed disinfectant, and warned the local contractor.',
    resolvedDaysAgo: 3
  },
  {
    title: 'Debris left after construction',
    description: 'Concrete chunks and sand pile left by builders on the public pavement, blocking pedestrians.',
    category: 'Sanitation',
    priority: 'LOW',
    sentiment: 'NEGATIVE',
    location: 'Kolkata, New Town',
    status: 'SUBMITTED'
  },
  {
    title: 'Piles of plastics in public park',
    description: 'Local food vendors dump plastic cups and plates inside the park. Needs immediate cleaning.',
    category: 'Sanitation',
    priority: 'MEDIUM',
    sentiment: 'NEGATIVE',
    location: 'Bhopal, MP Nagar',
    status: 'RESOLVED',
    resolutionNotes: 'Park cleaned, dustbins installed, and signboards put up.',
    resolvedDaysAgo: 14
  },
  {
    title: 'Stray animal dead body on road side',
    description: 'Decomposing body of a dog on the road side near Sector 5 crossing. High health risk.',
    category: 'Sanitation',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Patna, Boring Road',
    status: 'RESOLVED',
    resolutionNotes: 'Body removed and area disinfected.',
    resolvedDaysAgo: 1
  },

  // Drainage
  {
    title: 'Open sewer drain is a hazard',
    description: 'The manhole cover is completely missing on the main sidewalk. Anyone could fall into this deep drain.',
    category: 'Drainage',
    priority: 'CRITICAL',
    sentiment: 'NEGATIVE',
    location: 'Delhi, Rohini Sector 15',
    status: 'ASSIGNED'
  },
  {
    title: 'Drainage water overflowing on street',
    description: 'Clogged gutter causing dark, smelly sewer water to pool outside residential gates.',
    category: 'Drainage',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Ahmedabad, Navrangpura',
    status: 'IN_PROGRESS'
  },
  {
    title: 'Sewer block in apartment lane',
    description: 'Kitchen and toilet outlets in the lane are backing up due to a clogged central drainage channel.',
    category: 'Drainage',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Hyderabad, Secunderabad',
    status: 'RESOLVED',
    resolutionNotes: 'Cleared the blockages using mechanical rods. Flow normal.',
    resolvedDaysAgo: 7
  },

  // Random additional complaints for Recharts distribution
  {
    title: 'Street light broken by truck',
    description: 'A reversing truck hit the pole, breaking the top lamp and leaving it hanging by a wire.',
    category: 'Street Light',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Chandigarh, Sector 17',
    status: 'REOPENED'
  },
  {
    title: 'Illegal street parking blocking emergency lane',
    description: 'Cars parked double line, blocking fire engines or ambulance access.',
    category: 'Roads',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Mumbai, Colaba',
    status: 'REJECTED'
  },
  {
    title: 'Low hanging tree branches touching electrical transformer',
    description: 'Branches are hitting the transformer lines during winds, causing sparks and safety hazards.',
    category: 'Electricity',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Pune, Kothrud',
    status: 'SUBMITTED'
  },
  {
    title: 'Public water tap leaking endlessly',
    description: 'The valve of the public drinking stand is broken, water is leaking day and night.',
    category: 'Water Supply',
    priority: 'LOW',
    sentiment: 'NEUTRAL',
    location: 'Bangalore, Jayanagar',
    status: 'RESOLVED',
    resolutionNotes: 'Tap valve replaced.',
    resolvedDaysAgo: 6
  },
  {
    title: 'Water tank cover missing in public park',
    description: 'The underground municipal water reservoir tank lid is broken. Danger to kids.',
    category: 'Water Supply',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Delhi, Saket',
    status: 'ASSIGNED'
  },
  {
    title: 'Clogged storm drain',
    description: 'Storm drain clogged with dry leaves and plastic wrappers, street will flood in next rain.',
    category: 'Drainage',
    priority: 'MEDIUM',
    sentiment: 'NEGATIVE',
    location: 'Hyderabad, Jubilee Hills',
    status: 'SUBMITTED'
  },
  {
    title: 'Garbage dump near hospital gate',
    description: 'Garbage dump piled up right next to the hospital entrance. High infection danger.',
    category: 'Sanitation',
    priority: 'CRITICAL',
    sentiment: 'NEGATIVE',
    location: 'Kolkata, Elgin Road',
    status: 'IN_PROGRESS'
  },
  {
    title: 'Defective street light near bus stop',
    description: 'The light is out, creating a dark spot where girls feel unsafe waiting for late buses.',
    category: 'Street Light',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    location: 'Pune, Shivajinagar',
    status: 'ASSIGNED'
  },
  {
    title: 'Low water pressure in supply lines',
    description: 'Water pressure is so low it does not reach the ground floor storage tanks.',
    category: 'Water Supply',
    priority: 'LOW',
    sentiment: 'NEGATIVE',
    location: 'Delhi, Karol Bagh',
    status: 'SUBMITTED'
  },
  {
    title: 'Loose street manhole lid rattles loudly',
    description: 'Whenever a car passes over it, it makes a loud bang, disturbing sleep at night.',
    category: 'Drainage',
    priority: 'LOW',
    sentiment: 'NEGATIVE',
    location: 'Mumbai, Chembur',
    status: 'RESOLVED',
    resolutionNotes: 'Lid secured with cement mortar seals.',
    resolvedDaysAgo: 12
  }
];

// Coordinates database
const CITY_COORDINATES = {
  mumbai: [19.0760, 72.8777],
  delhi: [28.7041, 77.1025],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.3850, 78.4867],
  ahmedabad: [23.0225, 72.5714],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
  jaipur: [26.9124, 75.7873],
  lucknow: [26.8467, 80.9462],
  patna: [25.5941, 85.1376],
  bhopal: [23.2599, 77.4126],
  ranchi: [23.3441, 85.3096],
  chandigarh: [30.7333, 76.7794]
};

const getGeocode = (locationStr) => {
  const locLower = locationStr.toLowerCase();
  let baseCoords = [20.5937, 78.9629];
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (locLower.includes(city)) {
      baseCoords = coords;
      break;
    }
  }
  const jitterLat = (Math.random() - 0.5) * 0.05;
  const jitterLng = (Math.random() - 0.5) * 0.05;
  return [baseCoords[0] + jitterLat, baseCoords[1] + jitterLng];
};

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_complaint_resolution';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Complaint.deleteMany({});
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});
    await Feedback.deleteMany({});
    console.log('Cleared existing collections.');

    // 1. Create Departments
    const createdDepts = {};
    for (const d of SEED_DEPARTMENTS) {
      const dept = await Department.create(d);
      createdDepts[d.name] = dept;
    }
    console.log('Departments seeded successfully.');

    // 2. Create Users
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const officerPassword = await bcrypt.hash('officer123', salt);
    const userPassword = await bcrypt.hash('user123', salt);

    // Admin
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@civic.gov',
      password: adminPassword,
      role: 'ADMIN'
    });

    // Officers
    const roadsOfficer = await User.create({
      name: 'Vikram Singh (Roads)',
      email: 'roads_officer@civic.gov',
      password: officerPassword,
      role: 'DEPARTMENT_OFFICER',
      department: createdDepts['Roads Department']._id
    });

    const electricityOfficer = await User.create({
      name: 'Ramesh Kumar (Electricity)',
      email: 'elec_officer@civic.gov',
      password: officerPassword,
      role: 'DEPARTMENT_OFFICER',
      department: createdDepts['Electricity Department']._id
    });

    const waterOfficer = await User.create({
      name: 'Sneha Patil (Water)',
      email: 'water_officer@civic.gov',
      password: officerPassword,
      role: 'DEPARTMENT_OFFICER',
      department: createdDepts['Water Department']._id
    });

    const sanitationOfficer = await User.create({
      name: 'Amit Sharma (Sanitation)',
      email: 'san_officer@civic.gov',
      password: officerPassword,
      role: 'DEPARTMENT_OFFICER',
      department: createdDepts['Sanitation Department']._id
    });

    const drainageOfficer = await User.create({
      name: 'Deepak Rao (Drainage)',
      email: 'drain_officer@civic.gov',
      password: officerPassword,
      role: 'DEPARTMENT_OFFICER',
      department: createdDepts['Drainage Department']._id
    });

    // Citizens
    const citizen1 = await User.create({
      name: 'Rahul Verma',
      email: 'user1@gmail.com',
      password: userPassword,
      role: 'USER'
    });

    const citizen2 = await User.create({
      name: 'Priya Patel',
      email: 'user2@gmail.com',
      password: userPassword,
      role: 'USER'
    });

    console.log('Users seeded successfully.');

    // Department references map
    const deptMap = {
      'Roads': createdDepts['Roads Department'],
      'Electricity': createdDepts['Electricity Department'],
      'Street Light': createdDepts['Electricity Department'],
      'Water Supply': createdDepts['Water Department'],
      'Sanitation': createdDepts['Sanitation Department'],
      'Drainage': createdDepts['Drainage Department'],
      'Other': createdDepts['General Administration Department']
    };

    // Officer references map
    const officerMap = {
      'Roads': roadsOfficer,
      'Electricity': electricityOfficer,
      'Street Light': electricityOfficer,
      'Water Supply': waterOfficer,
      'Sanitation': sanitationOfficer,
      'Drainage': drainageOfficer
    };

    // 3. Seed 30+ complaints
    let count = 0;
    for (const t of SEED_COMPLAINT_TEMPLATES) {
      const citizen = count % 2 === 0 ? citizen1 : citizen2;
      const dept = deptMap[t.category] || deptMap['Other'];
      const officer = officerMap[t.category] || null;

      // Geocoding coords
      const [lat, lng] = getGeocode(t.location);

      // Create pre-analyzed metadata
      const priorityScore = t.priority === 'CRITICAL' ? 92 : t.priority === 'HIGH' ? 78 : t.priority === 'MEDIUM' ? 48 : 22;
      const hours = t.priority === 'CRITICAL' ? 12 : t.priority === 'HIGH' ? 24 : t.priority === 'MEDIUM' ? 48 : 72;
      
      const createdDate = new Date();
      // Scatter complaints over the last 3 months
      createdDate.setDate(createdDate.getDate() - (count * 3)); 

      let resolvedDate = null;
      let resTime = null;
      if (t.status === 'RESOLVED') {
        resolvedDate = new Date(createdDate);
        const days = t.resolvedDaysAgo || 1;
        resolvedDate.setDate(resolvedDate.getDate() + days);
        resTime = days * 24;
      }

      const complaintId = `CR-${10001 + count}`;

      const complaint = new Complaint({
        complaintId,
        userId: citizen._id,
        title: t.title,
        description: t.description,
        category: t.category,
        subcategory: '',
        priority: t.priority,
        sentiment: t.sentiment,
        urgencyScore: priorityScore,
        department: dept._id,
        location: t.location,
        latitude: lat,
        longitude: lng,
        imageUrl: '',
        status: t.status,
        assignedOfficer: t.status !== 'SUBMITTED' ? officer?._id : null,
        resolutionNotes: t.resolutionNotes || '',
        resolutionTime: resTime,
        resolvedAt: resolvedDate,
        createdAt: createdDate,
        updatedAt: createdDate,
        aiAnalysis: {
          categoryConfidence: 0.92,
          departmentConfidence: 0.90,
          priorityScore,
          summary: `AI auto-summary: ${t.title}`,
          suggestedAction: `Inspect grid nodes in ${t.location}.`,
          draftResponse: `Thank you, ${citizen.name}. A representative has been assigned.`,
          estimatedResolutionHours: hours,
          estimatedDate: new Date(createdDate.getTime() + hours * 60 * 60 * 1000),
          aiStatus: 'SUCCESS'
        }
      });

      await complaint.save();

      // Create citizen submission notification
      await Notification.create({
        userId: citizen._id,
        complaintId: complaint._id,
        message: `Complaint ${complaint.complaintId} has been successfully filed.`,
        createdAt: createdDate
      });

      // Create Audit Log
      await AuditLog.create({
        userId: citizen._id,
        userName: citizen.name,
        action: 'Complaint submitted',
        complaintId: complaint.complaintId,
        details: `Submitting title: ${t.title}`,
        createdAt: createdDate
      });

      // If resolved, create notification and feedback
      if (t.status === 'RESOLVED') {
        await Notification.create({
          userId: citizen._id,
          complaintId: complaint._id,
          message: `Your complaint ${complaint.complaintId} has been resolved!`,
          createdAt: resolvedDate
        });

        await AuditLog.create({
          userId: officer?._id || admin._id,
          userName: officer?._id ? officer.name : admin.name,
          action: 'Complaint resolved',
          complaintId: complaint.complaintId,
          details: t.resolutionNotes,
          createdAt: resolvedDate
        });

        // 50% chance of citizen feedback on resolved tickets
        if (count % 2 === 0) {
          const rating = 4 + (count % 2); // 4 or 5 star ratings
          await Feedback.create({
            complaintId: complaint._id,
            userId: citizen._id,
            rating,
            comment: 'Prompt resolution, highly satisfied.',
            createdAt: resolvedDate
          });
        }
      }

      count++;
    }

    console.log(`Seeded ${count} complaints successfully.`);
    mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();
