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
        },
        tenants: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        roles: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn(),
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
        (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(prisma));
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
        it('rejects weak public registration passwords before creating a tenant', async () => {
            const req = {
                body: {
                    email: 'weak@test.com',
                    password: 'short',
                    name: 'Weak User',
                    businessName: 'Weak Business'
                }
            } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

            await register(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should create a tenant owner without trusting client role or tenant IDs', async () => {
            const req = {
                body: {
                    email: 'new@test.com',
                    password: 'strong-password',
                    name: 'New User',
                    businessName: 'New Business',
                    roleId: 999,
                    tenantId: 999
                }
            } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

            (prisma.users.findUnique as jest.Mock).mockResolvedValue(null); // No existing user
            (prisma.tenants.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.roles.findUnique as jest.Mock).mockResolvedValue({ id: 7, name: 'Owner' });
            (prisma.tenants.create as jest.Mock).mockResolvedValue({ id: 42 });
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_pass');
            (prisma.users.create as jest.Mock).mockResolvedValue({
                id: 2,
                email: 'new@test.com',
                password_hash: 'hashed_new_pass',
                role_id: 7,
                tenant_id: 42
            });

            await register(req, res, jest.fn());

            expect(prisma.tenants.create).toHaveBeenCalled();
            expect(prisma.users.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    role_id: 7,
                    tenant_id: 42,
                    outlet_id: null
                })
            }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.not.objectContaining({ password_hash: expect.anything() })
            }));
        });
    });
});
