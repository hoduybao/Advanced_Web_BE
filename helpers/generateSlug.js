const slugify = require('slugify');

function generateSlug(name) {
    const baseSlug = slugify(name, {
        lower: true,  // Convert to lowercase
        remove: /[$*_+~.()'"!\-:@]/g,  // Remove special characters
    });

    const randomString = Math.random().toString(36).substring(2, 8);

    const slugWithRandom = `${baseSlug}-${randomString}`;

    return slugWithRandom;
}

module.exports = {
    generateSlug
};

