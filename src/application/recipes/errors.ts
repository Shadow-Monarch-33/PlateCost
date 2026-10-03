export class RecipeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipeValidationError";
  }
}

export class RecipeNotFoundError extends Error {
  constructor() {
    super("Recipe not found or inaccessible.");
    this.name = "RecipeNotFoundError";
  }
}

export class IncompatibleRecipeUnitError extends Error {
  constructor(recipeUnit: string, ingredientUnit: string) {
    super(
      `Unit "${recipeUnit}" is not compatible with an ingredient measured in "${ingredientUnit}".`,
    );
    this.name = "IncompatibleRecipeUnitError";
  }
}
