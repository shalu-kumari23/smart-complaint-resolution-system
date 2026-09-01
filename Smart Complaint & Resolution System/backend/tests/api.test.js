const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../server');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');

let token = '';
let officerToken = '';
let adminToken = '';
let complaintId = '';
let departmentId = '';
let officerId = '';

beforeAll(async () => {
  // Clear any existing test data just in case
  await User.deleteMany({ email: /test.*@civic\.gov/ });
  await Complaint.deleteMany({ title: /Test Complaint/ });
  await Department.deleteMany({ name: 'Test Department' });
});

afterAll(async () => {
  // Cleanup test entries
  await User.deleteMany({ email: /test.*@civic\.gov/ });
  await Complaint.deleteMany({ title: /Test Complaint/ });
  await Department.deleteMany({ name: 'Test Department' });

  // Close server and mongoose connection
  await mongoose.connection.close();
  await server.close();
});

describe('Smart Complaint & Resolution System Backend Integration Tests', () => {
  
  // 1. REGISTER
  it('should register a new citizen user', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Test Citizen',
        email: 'test_citizen@civic.gov',
        password: 'password123',
        role: 'USER'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toEqual('USER');
  });

  it('should register a new department officer', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Test Officer',
        email: 'test_officer@civic.gov',
        password: 'password123',
        role: 'DEPARTMENT_OFFICER',
        departmentName: 'Test Department'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toEqual('DEPARTMENT_OFFICER');
    
    officerId = res.body._id;
    departmentId = res.body.department;
  });

  it('should register a new administrator', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Test Admin',
        email: 'test_admin@civic.gov',
        password: 'password123',
        role: 'ADMIN'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toEqual('ADMIN');
  });

  // 2. LOGIN
  it('should authenticate user and return token', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'test_citizen@civic.gov',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('should authenticate admin and return token', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'test_admin@civic.gov',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    adminToken = res.body.token;
  });

  it('should authenticate officer and return token', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'test_officer@civic.gov',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    officerToken = res.body.token;
  });

  // 3. CREATE COMPLAINT
  it('should submit a new complaint and trigger fallback AI analysis', async () => {
    const res = await request(server)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Complaint: Water pipeline leakage',
        description: 'There is a major water pipeline leakage near the main market. Water is leaking for two days.',
        location: 'Mumbai, Andheri',
        category: 'Water Supply'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('complaintId');
    expect(res.body.category).toEqual('Water Supply');
    expect(res.body.status).toEqual('AI_ANALYZED');
    
    complaintId = res.body._id;
  });

  // 4. GET COMPLAINT
  it('should retrieve complaint details by ID', async () => {
    const res = await request(server)
      .get(`/api/complaints/${complaintId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.complaint.title).toContain('Test Complaint');
  });

  // 5. ASSIGN COMPLAINT (Admin)
  it('should allow admin to assign complaint to test department and officer', async () => {
    const res = await request(server)
      .put(`/api/complaints/${complaintId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentId,
        officerId
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('ASSIGNED');
    expect(res.body.assignedOfficer).toEqual(officerId);
  });

  // 6. UPDATE STATUS (Officer)
  it('should allow officer to update status to IN_PROGRESS', async () => {
    const res = await request(server)
      .put(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        status: 'IN_PROGRESS',
        resolutionNotes: 'Site visit completed. Pipeline inspection team dispatched.'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('IN_PROGRESS');
  });

  it('should allow officer to update status to RESOLVED', async () => {
    const res = await request(server)
      .put(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNotes: 'Fractured segment replaced. Supply restored and pressure tested.',
        resolutionProofUrl: 'https://files.gov/leak_fixed.jpg'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('RESOLVED');
    expect(res.body.resolutionTime).toBeGreaterThanOrEqual(0);
  });

  // 7. ADMIN DASHBOARD ANALYTICS
  it('should allow admin to fetch aggregate statistics', async () => {
    const res = await request(server)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body.kpis.totalComplaints).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('charts');
  });
});
