<template>
    <nav class="navbar">
        <ul class="navbar__list">
            <li class="navbar__item">
                <router-link to="/" class="navbar__link" active-class="active-link">Tab</router-link>
            </li>
            <li class="navbar__item">
                <router-link to="/file" class="navbar__link" active-class="active-link">File</router-link>
            </li>
        </ul>
    </nav>
</template>

<script>
export default {
    name: "Navbar",
};
</script>

<style>
/* Navbar container */
.navbar {
    background-color: whrgb(67 97 238 / 5%);
    /* Set background to white */
    padding: 10px;
    margin-top: 20px;
    display: flex;
    justify-content: center;
    /* Center align the navbar */
    font-family: 'Poppins', sans-serif;
    /* Set font to Poppins */
}

/* Navbar list */
.navbar__list {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
}

/* Navbar items */
.navbar__item {
    margin-right: 20px;
}

/* Navbar links */
.navbar__link {
    color: rgb(50, 50, 50);
    /* Inactive links are white */
    text-decoration: none;
    font-size: 20px;
    padding: 5px 10px;
    transition: color 0.3s ease;
    /* Smooth color transition */
}

/* Hover effect for links */
.navbar__link:hover {
    color: #007bff;
    /* Blue on hover */
}

/* Active link */
.active-link {
    color: #007bff;
    /* Active link color is blue */
}
</style>