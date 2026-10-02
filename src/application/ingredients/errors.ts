export class IngredientReferencedInRecipesError extends Error {
  readonly recipeCount: number;

  constructor(recipeCount: number) {
    const plural = recipeCount === 1 ? "recipe" : "recipes";
    super(
      `Cannot delete ingredient: it is used in ${recipeCount} ${plural}. Remove it from all recipes first.`,
    );
    this.name = "IngredientReferencedInRecipesError";
    this.recipeCount = recipeCount;
  }
}

export class IngredientNotFoundError extends Error {
  constructor(ingredientId?: string) {
    super(
      ingredientId
        ? `Ingredient ${ingredientId} not found or inaccessible.`
        : "Ingredient not found or inaccessible.",
    );
    this.name = "IngredientNotFoundError";
  }
}

export class UnauthorizedBusinessError extends Error {
  constructor(message = "Unauthorized: active business session required.") {
    super(message);
    this.name = "UnauthorizedBusinessError";
  }
}

export class BaseUnitImmutableError extends Error {
  constructor() {
    super("Base unit cannot be changed after creation.");
    this.name = "BaseUnitImmutableError";
  }
}
