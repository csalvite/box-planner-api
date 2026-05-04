# Testing Guide

## 1. Why Testing Matters

Tests help you verify automatically that your code behaves as expected and protect you from regressions when you change business logic.

In this project, the main value of testing is:

- validating business logic
- validating ownership and access control
- checking expected error handling
- ensuring dangerous operations are not executed when a precondition fails

## 2. Main Testing Types in NestJS

### Unit Tests

Unit tests validate one class or method in isolation.

Characteristics:

- dependencies are mocked
- fast execution
- ideal for services such as `BlocksService`

### End-to-End Tests

E2E tests validate real HTTP flows and integration between modules.

Characteristics:

- validate controllers, guards, pipes, services, and app setup together
- slower than unit tests
- useful for critical user flows

For this project, starting with unit tests is the right approach.

## 3. Tools Used

- `Jest`
- `@nestjs/testing`
- manual mocks for dependencies such as `PrismaService`

## 4. Core Mental Model

Use the `Arrange / Act / Assert` pattern:

### Arrange

Prepare the scenario, inputs, and mocks.

### Act

Execute the method you want to test.

### Assert

Verify the result, thrown error, or side effect.

Example:

- mock `findFirst` to return `null`
- call `service.findOne(...)`
- verify that it throws `NotFoundException`

## 5. Base Pattern for a Service Test

Example Prisma mock:

```ts
const prismaMock = {
  block: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
```

Example Nest testing module:

```ts
const module: TestingModule = await Test.createTestingModule({
  providers: [
    BlocksService,
    {
      provide: PrismaService,
      useValue: prismaMock,
    },
  ],
}).compile();
```

This lets you test business logic without using a real database.

## 6. Mocking Async Dependencies

To simulate a successful async dependency:

```ts
prismaMock.block.findFirst.mockResolvedValue(block);
```

To simulate missing data:

```ts
prismaMock.block.findFirst.mockResolvedValue(null);
```

## 7. Testing Success Cases

A good success-case test usually verifies:

- the dependency was called with the correct query
- the method returned the expected result

Example:

```ts
const result = await service.findOne('block-1', 'user-1');

expect(prismaMock.block.findFirst).toHaveBeenCalledWith({
  where: {
    id: 'block-1',
    userId: 'user-1',
  },
  include: {
    category: true,
    exercises: {
      orderBy: { orderIndex: 'asc' },
    },
  },
});

expect(result).toEqual(block);
```

## 8. Testing Error Cases

For async methods, this is the standard pattern:

```ts
await expect(service.findOne('block-1', 'user-1')).rejects.toThrow(
  'Block not found',
);
```

Avoid using manual `try/catch` in tests unless you truly need it.

## 9. Test Side Effects, Not Just Results

In sensitive logic, it is not enough to check that a method fails.

You should also verify:

- the final action executes in the happy path
- the final action does not execute if a precondition fails

Examples:

```ts
expect(prismaMock.block.update).not.toHaveBeenCalled();
expect(prismaMock.block.delete).not.toHaveBeenCalled();
```

This is especially important for ownership, validation, and permission checks.

## 10. Common Beginner Mistakes

- testing something different from what the real code does
- mixing expectations from different Prisma calls
- checking only `toHaveBeenCalled()` instead of checking arguments too
- ignoring negative/error cases
- writing overly large tests that verify too many things at once

One important lesson from this project:

- `findFirst(...)` and `delete(...)` are different calls and should be asserted separately

## 11. How to Decide What to Test

For each service method, start with:

1. one success case
2. one main error case
3. a check that dangerous actions do not run if validation fails
4. ownership/authorization cases if the method depends on user identity

## 12. Commands to Run Tests

From the project root:

```powershell
npm.cmd run test
```

Watch mode:

```powershell
npm.cmd run test:watch
```

Coverage:

```powershell
npm.cmd run test:cov
```

End-to-end tests:

```powershell
npm.cmd run test:e2e
```

Run a single spec file:

```powershell
npx.cmd jest src/blocks/blocks.service.spec.ts
```

Use `npm.cmd` and `npx.cmd` if PowerShell script execution blocks `npm` or `npx`.

## 13. Reusable Workflow for Future Tests

When writing a new service test:

1. identify the method to test
2. identify external dependencies
3. mock those dependencies
4. write the happy path
5. write the main failure path
6. verify side effects or blocked actions
7. run the spec file alone
8. run the full test suite

## 14. How to Explain This in an Interview

Example answer:

> In NestJS, I usually start with unit tests using Jest and `@nestjs/testing`. I mock dependencies such as Prisma so I can validate business logic in isolation. I cover both happy paths and error cases, and in permission-sensitive flows I also verify that operations like update or delete are not executed if a precondition fails. After that, I complement critical flows with e2e tests to validate real integration between controllers, guards, pipes, and services.

## 15. What Was Learned in This Practice

With `BlocksService`, the most important lessons were:

- creating a Nest testing module
- mocking Prisma methods
- using `mockResolvedValue`
- using `rejects.toThrow`
- validating exact Prisma calls with `toHaveBeenCalledWith`
- validating blocked side effects with `not.toHaveBeenCalled`

## 16. Final Rule of Thumb

A useful test is not the one that simply passes.

A useful test is the one that fails when an important contract is broken.
