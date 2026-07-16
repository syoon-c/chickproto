(function () {
  "use strict";

  function loadTables() {
    const raw = window.CHICK_TABLE_SOURCE;
    if (!raw) {
      throw new Error("브라우저용 테이블 데이터가 없습니다. runtime-tables.js를 다시 생성해 주세요.");
    }

    const rewardGroups = new Map();
    raw.RewardGroup.forEach((row) => {
      if (!rewardGroups.has(row.rewardId)) rewardGroups.set(row.rewardId, []);
      rewardGroups.get(row.rewardId).push(row);
    });

    const availableMissionActions = new Set([1, 2, 3, 4, 6, 7, 10, 11, 12, 13, 14]);
    const recipes = raw.Recipe.map((row) => ({
      ...row,
      foodPrice: Number(row.foodPrice) + ([1, 4].includes(Number(row.id)) ? 10 : 0),
    }));
    const mainMissions = raw.MainMission
      .map((row, index) => ({ ...row, iconIndex: index + 1 }))
      .filter((row) => availableMissionActions.has(Number(row.actionType)));

    return Promise.resolve({
      raw,
      general: Object.fromEntries(raw.GeneralSetting.map((row) => [row.key, row.value])),
      recipeSetting: Object.fromEntries(raw.RecipeSetting.map((row) => [row.key, row.value])),
      customerSetting: Object.fromEntries(raw.CustomerSetting.map((row) => [row.key, row.value])),
      recipes: new Map(recipes.map((row) => [row.id, row])),
      ingredients: new Map(raw.Ingredient.map((row) => [row.id, row])),
      areaExpansions: raw.AreaExpansion,
      customers: raw.Customer,
      commonCustomers: new Map(raw.CommonCustomer.map((row) => [row.id, row])),
      recipeResearch: raw.RecipeResearch,
      repeatMissions: raw.RepeatMission.filter((row) => availableMissionActions.has(Number(row.actionType))),
      mainMissions,
      rewards: rewardGroups,
      staff: raw.Staff.filter((row) => row.areaType === 1),
      staffLevels: raw.StaffLevelUp,
      performances: raw.Performance,
      specialCustomers: raw.SpecialCustomer.filter((row) => row.areaType === 1),
      restaurantThemes: raw.ThemeFacility.filter((row) => row.areaType === 1),
      installs: raw.InstallFacility
        .filter((row) => row.areaType === 1)
        .map((row) => ({ ...row, facilityPrice: Math.max(1, Math.ceil(Number(row.facilityPrice) / 2)) }))
        .sort((a, b) => a.sequence - b.sequence || a.id - b.id),
    });
  }

  window.ChickData = { loadTables };
})();
