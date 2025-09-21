import { test, expect } from "bun:test";
import { createControllerResolver } from "./controllerResolver";
import { createController } from "../controller/controller";

test("createControllerResolver with single controller", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Controller Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const { controller } = await createController(
    "https://test.example/resolver/001",
    ["https://test.example"],
    geometry,
    address,
    "ES256"
  );

  const controllerResolver = await createControllerResolver([
    ["https://test.example/resolver/001", controller]
  ]);

  const resolved = await controllerResolver.resolve("https://test.example/resolver/001");
  expect(resolved).toBeDefined();
  expect(resolved.assertion).toBeDefined();
  expect(resolved.authentication).toBeDefined();
});

test("createControllerResolver with multiple controllers", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Multi Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const { controller: controller1 } = await createController(
    "https://test1.example/resolver/001",
    ["https://test1.example"],
    geometry,
    address,
    "ES256"
  );

  const { controller: controller2 } = await createController(
    "https://test2.example/resolver/002",
    ["https://test2.example"],
    geometry,
    address,
    "ES384"
  );

  const controllerResolver = await createControllerResolver([
    ["https://test1.example/resolver/001", controller1],
    ["https://test2.example/resolver/002", controller2]
  ]);

  const resolved1 = await controllerResolver.resolve("https://test1.example/resolver/001");
  const resolved2 = await controllerResolver.resolve("https://test2.example/resolver/002");

  expect(resolved1).toBeDefined();
  expect(resolved2).toBeDefined();
  expect(resolved1.assertion).toBeDefined();
  expect(resolved2.assertion).toBeDefined();
});

test("controllerResolver throws error for non-existent controller", async () => {
  const controllerResolver = await createControllerResolver([]);

  await expect(controllerResolver.resolve("https://nonexistent.example/controller/001"))
    .rejects.toThrow("Controller not found for id: https://nonexistent.example/controller/001");
});

test("resolve assertion and authentication keys", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Keys Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const { controller } = await createController(
    "https://test.example/keys/001",
    ["https://test.example"],
    geometry,
    address,
    "ES256"
  );

  const controllerResolver = await createControllerResolver([
    ["https://test.example/keys/001", controller]
  ]);

  const resolved = await controllerResolver.resolve("https://test.example/keys/001");
  const assertionResolver = await resolved.assertion;
  const authenticationResolver = await resolved.authentication;

  expect(assertionResolver).toBeDefined();
  expect(authenticationResolver).toBeDefined();
  expect(typeof assertionResolver.resolve).toBe("function");
  expect(typeof authenticationResolver.resolve).toBe("function");
});