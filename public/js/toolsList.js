const tools = [
    { tool_name: "Merge PDF", link: "/merge-pdf", icon: "/images/favicon.ico" },
    { tool_name: "Split PDF", link: "/split-pdf", icon: "/images/favicon.ico" },
    { tool_name: "Image to PDF", link: "/imagetopdf", icon: "/images/favicon.ico" },
    { tool_name: "Edit PDF Pages", link: "/edit-pdf-pages", icon: "/images/favicon.ico" },
    { tool_name: "Rotate All Pages", link: "/rotate-pages", icon: "/images/favicon.ico" },
    { tool_name: "Add Page Number", link: "/add-page-numbers", icon: "/images/favicon.ico" },
    { tool_name: "Remove Pages", link: "/remove-pages", icon: "/images/favicon.ico" },
    { tool_name: "Add Watermark", link: "/edit-pdf-pages", icon: "/images/favicon.ico" },
    { tool_name: "Word to PDF", link: "/word-to-pdf", icon: "/images/favicon.ico" },
    { tool_name: "Excel to PDF", link: "/excel-to-pdf", icon: "/images/favicon.ico" },
    { tool_name: "Powerpoint to PDF", link: "/powerpoint-to-pdf", icon: "/images/favicon.ico" }
];

const toolsGrid = document.getElementById('tools-grid');
const seeMoreLink = document.getElementById('see-more-link');

// Create tool card
function createToolCard(tool, isHidden = false) {
    return `
        <a href="${tool.link}" class="tool-card group ${isHidden ? 'hidden' : ''}">
          <div class="bg-white border border-gray-200 rounded-2xl p-2 hover:shadow-lg flex items-center justify-between h-full">
            
            <div class="flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center">
                <img src="${tool.icon}" class="w-6 h-6" />
              </div>
              <h3 class="text-base font-medium text-gray-900 group-hover:text-primary">
                ${tool.tool_name}
              </h3>
            </div>

            <div class="mr-3">
  <svg class="w-3 h-3 text-gray-400 group-hover:text-gray-500 
       group-hover:translate-x-1 transition-all duration-300"
       xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 8 14">
    <path stroke="currentColor" stroke-linecap="round" 
          stroke-linejoin="round" stroke-width="2" 
          d="m1 13 5.7-5.326a.909.909 0 0 0 0-1.348L1 1"/>
  </svg>
</div>

          </div>
        </a>
      `;
}

// Render tools
function renderTools() {
    let html = '';

    if (tools.length <= 8) {
        // Show all tools
        tools.forEach(tool => {
            html += createToolCard(tool);
        });

        // Hide "See More"
        seeMoreLink.style.display = 'none';

    } else {
        // First 8 visible
        for (let i = 0; i < 8; i++) {
            html += createToolCard(tools[i]);
        }

        // Remaining hidden
        for (let i = 8; i < tools.length; i++) {
            html += createToolCard(tools[i], true);
        }

        // Show "See More"
        seeMoreLink.style.display = 'block';
    }

    toolsGrid.innerHTML = html;
}

// See More click
seeMoreLink.addEventListener('click', function (e) {
    e.preventDefault();

    const hiddenTools = document.querySelectorAll('.tool-card.hidden');

    hiddenTools.forEach((tool, index) => {
        tool.classList.remove('hidden');

        // Animation
        tool.style.opacity = '0';
        tool.style.transform = 'translateY(20px)';

        setTimeout(() => {
            tool.style.transition = 'all 0.4s ease';
            tool.style.opacity = '1';
            tool.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Hide button
    seeMoreLink.style.display = 'none';
});

// Init
renderTools();