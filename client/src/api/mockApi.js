// Mock API service for development without backend

// Mock data for hazards
const mockHazards = [
  {
    _id: '1',
    type: 'pothole',
    image_url: 'https://images.unsplash.com/photo-1560782205-4dd83ceb0270?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cG90aG9sZXxlbnwwfHwwfHx8MA%3D%3D',
    latitude: 26.218287,
    longitude: 78.182831,
    ai_severity: 7,
    ai_category: 'pothole',
    ai_description: 'Large pothole in the middle of the road, approximately 2 feet wide and 1 foot deep.',
    priority_score: 85,
    confirmations: 12,
    upvotes: 8,
    status: 'open',
    reported_by: 'user123',
    created_at: new Date().toISOString(),
    repair_image_url: null,
    repair_verified: false,
    resolved_by: null,
    resolved_at: null
  },
  {
    _id: '2',
    type: 'garbage',
    image_url: 'https://images.unsplash.com/photo-1495556650867-99590cea3657?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fGdhcmJhZ2V8ZW58MHx8MHx8fDA%3D',
    latitude: 40.7589,
    longitude: -73.9851,
    ai_severity: 4,
    ai_category: 'garbage',
    ai_description: 'Trash堆积ing up on the sidewalk, blocking pedestrian passage.',
    priority_score: 45,
    confirmations: 3,
    upvotes: 5,
    status: 'open',
    reported_by: 'user456',
    created_at: new Date().toISOString(),
    repair_image_url: null,
    repair_verified: false,
    resolved_by: null,
    resolved_at: null
  },
  {
    _id: '3',
    type: 'waterlogging',
    image_url: 'https://images.unsplash.com/photo-1605476681254-f2e9db171c11?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGRpcnR5fGVufDB8fDB8fHww',
    latitude: 40.7505,
    longitude: -73.9934,
    ai_severity: 6,
    ai_category: 'waterlogging',
    ai_description: 'Flooded street due to heavy rainfall, water depth approximately 6 inches.',
    priority_score: 67,
    confirmations: 7,
    upvotes: 4,
    status: 'open',
    reported_by: 'user789',
    created_at: new Date().toISOString(),
    repair_image_url: null,
    repair_verified: false,
    resolved_by: null,
    resolved_at: null
  }
];

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export const mockApi = {
  getHazards: async () => {
    await delay(500); // Simulate network delay
    return {
      success: true,
      data: mockHazards
    };
  },

  getHazardById: async (id) => {
    await delay(300);
    const hazard = mockHazards.find(h => h._id === id);
    return {
      success: true,
      data: hazard
    };
  },

  createHazard: async (formData) => {
    await delay(800);
    // Extract data from formData
    const latitude = parseFloat(formData.get('latitude'));
    const longitude = parseFloat(formData.get('longitude'));
    
    // Generate a random image URL for the mock response
    const imageCategories = [
      'construction-site',
      'road-works',
      'accident-scene',
      'street-repair',
      'infrastructure'
    ];
    const randomCategory = imageCategories[Math.floor(Math.random() * imageCategories.length)];
    const randomNum = Math.floor(Math.random() * 100);
    
    const newHazard = {
      _id: (mockHazards.length + 1).toString(),
      type: 'other', // Default type since image processing isn't implemented in mock
      image_url: `https://picsum.photos/400/300?random=${Date.now()}`, // Dynamic placeholder image
      latitude: latitude,
      longitude: longitude,
      ai_severity: Math.floor(Math.random() * 6) + 5, // Random severity 5-10
      ai_category: ['pothole', 'garbage', 'waterlogging', 'road_damage', 'other'][Math.floor(Math.random() * 5)],
      ai_description: 'Automatically detected hazard from user report. AI analysis pending.',
      priority_score: 25,
      confirmations: 0,
      upvotes: 0,
      status: 'open',
      reported_by: 'current_user',
      created_at: new Date().toISOString(),
      repair_image_url: null,
      repair_verified: false,
      resolved_by: null,
      resolved_at: null
    };
    
    mockHazards.push(newHazard);
    return {
      success: true,
      data: newHazard
    };
  },

  confirmHazard: async (id) => {
    await delay(300);
    const hazardIndex = mockHazards.findIndex(h => h._id === id);
    if (hazardIndex !== -1) {
      mockHazards[hazardIndex].confirmations += 1;
      mockHazards[hazardIndex].priority_score += 3;
    }
    return {
      success: true,
      data: { message: 'Hazard confirmed successfully' }
    };
  },

  upvoteHazard: async (id) => {
    await delay(300);
    const hazardIndex = mockHazards.findIndex(h => h._id === id);
    if (hazardIndex !== -1) {
      mockHazards[hazardIndex].upvotes += 1;
      mockHazards[hazardIndex].priority_score += 2;
    }
    return {
      success: true,
      data: { message: 'Hazard upvoted successfully' }
    };
  },

  loginWithGoogle: async (token) => {
    await delay(500);
    return {
      success: true,
      data: {
        token: 'mock_jwt_token_for_development',
        user: {
          id: 'mock_user_123',
          email: 'user@example.com',
          name: 'Mock User'
        }
      }
    };
  }
};

export default mockApi;