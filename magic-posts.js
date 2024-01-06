// Listen for clicks on sidebar links
document.querySelectorAll('#sidebar .list-group-item').forEach(function(link) {
    link.addEventListener('click', function(e) {
        // Prevent default anchor behavior
        e.preventDefault();

        var targetId = this.getAttribute('data-target');
        var targetContent = document.querySelector(targetId);

        // Hide all post content divs
        document.querySelectorAll('.post-content').forEach(function(content) {
            content.style.display = 'none';
        });

        // Show the target content div
        targetContent.style.display = 'block';

        // Update URL hash without scrolling
        history.pushState(null, null, window.location.pathname + targetId);
    });
});

// Handle browser back button
window.addEventListener('popstate', function() {
    var hashLocation = window.location.hash.substring(1); // Get the hash value
    var targetContent = document.getElementById(hashLocation);

    if (targetContent) {
        // Show only the content that matches the hash
        document.querySelectorAll('.post-content').forEach(function(content) {
            content.style.display = 'none';
        });
        targetContent.style.display = 'block';
    } else {
        // If there's no hash, hide all content
        document.querySelectorAll('.post-content').forEach(function(content) {
            content.style.display = 'none';
        });
    }
});

// Check if there is a hash in the URL on page load
if(window.location.hash) {
    var hashLocation = window.location.hash.substring(1); // Get the hash value
    var targetContent = document.getElementById(hashLocation);

    if (targetContent) {
        document.querySelectorAll('.post-content').forEach(function(content) {
            content.style.display = 'none';
        });
        targetContent.style.display = 'block';
    }
}
