import { login, register } from '../../src/modules/shared/controllers/auth.controller';
import prisma from '../../src/utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock Dependencies
jest.mock('../../src/utils/prisma', () => ({
    __esModule: true,
    default: {
        users: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        }
    }
}));

jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
}));

describe('Auth Controller Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            // Mock Request
            const req = { body: { email: 'admin@test.com', password: 'password123' } } as any;
            const res = { json: jest.fn() } as any;
            const next = jest.fn();

            // Mock DB User
            const mockUser = {
                id: 1,
                email: 'admin@test.com',
                password_hash: 'hashed_password',
                role_id: 1,
                roles: { name: 'Admin' },
                is_active: true,
                tenants_users_tenant_idTotenants: { is_active: true, subscription_status: 'active' }
            };

            (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Password match
            (jwt.sign as jest.Mock).mockReturnValue('fake_jwt_token');

            await login(req, res, next);

            expect(prisma.users.update).toHaveBeenCalled(); // Update last login
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    token: 'fake_jwt_token'
                })
            }));
        });

        it('should fail with invalid password', async () => {
            const req = { body: { email: 'admin@test.com', password: 'wrong' } } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

            (prisma.users.findUnique as jest.Mock).mockResolvedValue({ password_hash: 'hashed' });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await login(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe('register', () => {
        it('should create new user', async () => {
            const req = { body: { email: 'new@test.com', password: 'pass', name: 'New User' } } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

            (prisma.users.findUnique as jest.Mock).mockResolvedValue(null); // No existing user
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_pass');
            (prisma.users.create as jest.Mock).mockResolvedValue({ id: 2, email: 'new@test.com' });

            await register(req, res, jest.fn());

            expect(prisma.users.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});
