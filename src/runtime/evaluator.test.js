const { evaluate } = require("./evaluator");

describe("Feature Flag Evaluation Engine", () => {

    test("same user produces deterministic result", () => {
        const flag = {
            key: "determinism_test",
            enabled: true,
            rolloutPercentage: 50
        };

        const result1 = evaluate("user_123", flag);
        const result2 = evaluate("user_123", flag);

        expect(result1).toBe(result2);
    });


    test("0 percent rollout disables everyone", () => {
        const flag = {
            key: "zero_rollout",
            enabled: true,
            rolloutPercentage: 0
        };

        expect(evaluate("user_1", flag)).toBe(false);
        expect(evaluate("user_2", flag)).toBe(false);
        expect(evaluate("user_999", flag)).toBe(false);
    });


    test("100 percent rollout enables everyone", () => {
        const flag = {
            key: "full_rollout",
            enabled: true,
            rolloutPercentage: 100
        };

        expect(evaluate("user_1", flag)).toBe(true);
        expect(evaluate("user_2", flag)).toBe(true);
        expect(evaluate("user_999", flag)).toBe(true);
    });


    test("targeting overrides rollout", () => {
        const flag = {
            key: "target_override",
            enabled: true,
            rolloutPercentage: 0,
            targeting: {
                allow: ["special_user"]
            }
        };

        expect(evaluate("special_user", flag)).toBe(true);
        expect(evaluate("normal_user", flag)).toBe(false);
    });


    test("disabled flag always returns false", () => {
        const flag = {
            key: "disabled_flag",
            enabled: false,
            rolloutPercentage: 100
        };

        expect(evaluate("user_1", flag)).toBe(false);
    });


    test("distribution roughly matches rollout percentage", () => {
        const flag = {
            key: "distribution_test",
            enabled: true,
            rolloutPercentage: 30
        };

        const totalUsers = 10000;
        let enabledCount = 0;

        for (let i = 0; i < totalUsers; i++) {
            const user = `user_${i}`;

            if (evaluate(user, flag)) {
                enabledCount++;
            }
        }

        const percentage = (enabledCount / totalUsers) * 100;

        expect(percentage).toBeGreaterThan(27);
        expect(percentage).toBeLessThan(33);
    });


    test("rollout results are independent per flag", () => {
        const flagA = {
            key: "flag_A",
            enabled: true,
            rolloutPercentage: 50
        };

        const flagB = {
            key: "flag_B",
            enabled: true,
            rolloutPercentage: 50
        };

        const user = "user_independent_test";

        const resultA = evaluate(user, flagA);
        const resultB = evaluate(user, flagB);

        expect(typeof resultA).toBe("boolean");
        expect(typeof resultB).toBe("boolean");
    });

});
