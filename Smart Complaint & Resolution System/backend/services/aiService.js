const axios = require('axios');

// Predefined keywords for local Javascript fallback
const CATEGORY_KEYWORDS = {
  "Roads": ["road", "pothole", "street", "highway", "asphalt", "flyover", "pavement", "construction", "crack", "tar"],
  "Electricity": ["electricity", "power", "shock", "wire", "voltage", "blackout", "load shedding", "sparking", "meter", "current"],
  "Street Light": ["street light", "streetlight", "street-light", "bulb", "lamp"],
  "Water Supply": ["water", "leak", "pipe", "tap", "supply", "drinking", "contamination", "chlorine", "no water"],
  "Sanitation": ["garbage", "trash", "waste", "cleaning", "sewage", "dump", "dirty", "odour", "litter", "unhygienic"],
  "Drainage": ["drain", "sewer", "drainage", "overflow", "gutter", "blockage"]
};

const URGENT_KEYWORDS = ["danger", "emergency", "sparking", "flooding", "broken wire", "accident", "injury", "death", "immediate", "severe", "life-threatening", "critical", "shock"];
const MEDIUM_KEYWORDS = ["leakage", "dirty", "bill", "not working", "smell", "delay", "damaged", "repair", "maintenance"];

const POSITIVE_KEYWORDS = ["good", "great", "excellent", "thanks", "satisfied", "helpful", "happy", "thank you", "appreciate", "resolved"];
const NEGATIVE_KEYWORDS = ["bad", "worst", "terrible", "useless", "broken", "dirty", "angry", "frustrated", "delay", "careless", "lazy", "horrible", "awful", "unacceptable", "hazardous"];

const DEPARTMENT_ROUTING = {
  "Roads": "Roads Department",
  "Electricity": "Electricity Department",
  "Street Light": "Electricity Department",
  "Water Supply": "Water Department",
  "Sanitation": "Sanitation Department",
  "Drainage": "Drainage Department",
  "Other": "General Administration Department"
};

// Deterministic JavaScript rule-based fallback
const runLocalFallback = (text, userCategory = null) => {
  const textLower = text.toLowerCase();
  
  // 1. Category Detection
  let detectedCategory = 'Other';
  if (userCategory && userCategory !== 'Other') {
    detectedCategory = userCategory;
  } else {
    let maxMatches = 0;
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const matches = keywords.filter(kw => textLower.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = category;
      }
    }
  }

  // 2. Priority & Urgency Score
  let priority = 'LOW';
  let urgencyScore = 20;
  const urgentMatches = URGENT_KEYWORDS.filter(kw => textLower.includes(kw)).length;
  const mediumMatches = MEDIUM_KEYWORDS.filter(kw => textLower.includes(kw)).length;

  if (urgentMatches > 0) {
    priority = 'CRITICAL';
    urgencyScore = Math.min(95, 75 + urgentMatches * 5);
  } else if (mediumMatches > 0) {
    priority = 'HIGH';
    urgencyScore = Math.min(70, 50 + mediumMatches * 5);
  } else {
    const wordsCount = textLower.split(' ').length;
    if (wordsCount > 15) {
      priority = 'MEDIUM';
      urgencyScore = 40;
    }
  }

  // 3. Sentiment
  let sentiment = 'NEUTRAL';
  const posMatches = POSITIVE_KEYWORDS.filter(kw => textLower.includes(kw)).length;
  const negMatches = NEGATIVE_KEYWORDS.filter(kw => textLower.includes(kw)).length;

  if (negMatches > posMatches) {
    sentiment = 'NEGATIVE';
  } else if (posMatches > negMatches) {
    sentiment = 'POSITIVE';
  }

  // 4. Department
  const recommendedDept = DEPARTMENT_ROUTING[detectedCategory] || DEPARTMENT_ROUTING['Other'];

  // 5. Resolution ETA
  let hours = 48;
  if (priority === 'CRITICAL') hours = 12;
  else if (priority === 'HIGH') hours = 24;
  else if (priority === 'LOW') hours = 72;

  const estimatedDate = new Date();
  estimatedDate.setHours(estimatedDate.getHours() + hours);

  return {
    category: detectedCategory,
    categoryConfidence: 0.5,
    priority,
    priorityScore: urgencyScore,
    sentiment,
    urgencyScore,
    department: recommendedDept,
    departmentConfidence: 0.5,
    summary: `[Local Fallback Summary] ${text.substring(0, 100)}...`,
    suggestedAction: "Rule-based recommendation: Route to local inspector.",
    draftResponse: "Thank you for bringing this to our attention. We have flagged this under our rule-based routing fallback system.",
    estimatedResolutionHours: hours,
    estimatedDate: estimatedDate.toISOString(),
    isDuplicate: false,
    duplicates: [],
    aiStatus: 'FAILED', // Flagged as failed so Admin can retry via FastAPI
    isFallback: true
  };
};

const analyzeComplaint = async (text, userCategory = null, location = null) => {
  const serviceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  
  try {
    const response = await axios.post(`${serviceUrl}/analyze`, {
      text,
      category: userCategory || undefined,
      location: location || undefined
    }, { timeout: 3000 }); // 3 seconds timeout

    return {
      ...response.data,
      aiStatus: 'SUCCESS',
      isFallback: false
    };
  } catch (error) {
    console.warn(`⚠️ AI Service at ${serviceUrl} unavailable. Running local fallback:`, error.message);
    return runLocalFallback(text, userCategory);
  }
};

module.exports = {
  analyzeComplaint
};
