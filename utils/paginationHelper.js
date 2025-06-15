module.exports = {
  generatePagination: (totalItems, page = 1, limit = 10) => {
    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) {
      page = 1;
    }
    if (isNaN(limit) || limit < 1) {
      limit = 10;
    }

    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;

    return {
      currentPage: page,
      perPage: limit,
      totalItems: totalItems,
      totalPages: totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      offset: offset,
    };
  },
};
