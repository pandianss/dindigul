import { Request } from 'express';

export const parsePagination = (req: Request | any, defaultLimit = 50) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || defaultLimit));
    const skip = (page - 1) * limit;

    return { page, limit, skip, take: limit };
};

export const getPaginatedResponse = <T>(data: T[], total: number, page: number, limit: number) => {
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total
        }
    };
};
