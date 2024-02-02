function formatDate(date) {
  let options = {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return new Date(date).toLocaleDateString(undefined, options);
}

function showDialog(id) {
  let ifOpen = false;
  if (document.getElementById(id).open) ifOpen = true;
  document.querySelectorAll("dialog").forEach((element) => {
    element.close();
  });
  if (!ifOpen) {
    document.getElementById(id).open = true;
  }
}

window.onload = async () => {
  loadMain();
  loadViews();
};

// main
async function loadMain() {
  const title = document.getElementById("title");
  const description = document.getElementById("description");
  if (!location.hash) {
    title.innerHTML = "My blogs";
    description.innerHTML = "by <a href='https://ma.cyou'>Mapagmataas</a>";
    window.title = "My blogs";
    await searchBlogs();
    return;
  }
  const blogsContainer = document.getElementById("blogs-container");
  const blogName = decodeURIComponent(location.hash).substring(1);
  let snap = await db.get(db.ref(db.link, "blogs/" + blogName));
  if (!snap.exists()) {
    blogsContainer.innerHTML = `<p>No blog with name ${blogName} found</p>`;
    return;
  }
  let blog = snap.val();

  document.getElementById("additional").innerHTML = `
    <span class="material-symbols-outlined" style="cursor: pointer" onclick="viewBlog()">arrow_back</span>
  `;
  title.innerHTML = blog.title;
  document.getElementById("description").innerHTML = blog.description
    ? `
      ${blog.description}<br />
      <p>${formatDate(blog.date)}</p>
    `
    : formatDate(blog.date);
  const styleCode = !ifAdmin
    ? ""
    : ` <span id="blog-style-edit" class="code" role="textbox" contenteditable>${blog.style}</span>`;
  const htmlCode = !ifAdmin
    ? ""
    : `<span id="blog-html-edit" class="code" role="textbox" contenteditable>${blog.html
        .replace(/</g, "&lt;")
        .replace(/</g, "&gt;")}</span>`;
  const deleteBtn = !ifAdmin
    ? ""
    : `<span class="blog-delete material-symbols-outlined"
    onclick="adminDelBlog('${blog.title.toLowerCase()}')">delete</span>`;

  blogsContainer.innerHTML = `
    <style id="blog-style">${blog.style}</style>
    ${styleCode}
    ${htmlCode}
    <div id="blog-html" class="blog-body">${blog.html}</div>
    ${deleteBtn}
  `;
}

document.getElementById("search-btn").onclick = () => {
  showDialog("search-blogs");
};

window.searchBlogs = async (context) => {
  const blogsContainer = document.getElementById("blogs-container");
  let snap = await db.get(db.ref(db.link, "blogs"));
  if (!snap.exists()) {
    blogsContainer.innerHTML = "<p>No blogs found</p>";
    return;
  }

  const blogs = [];
  snap.forEach((blogSnap) => {
    if (!context || context == "" || blogSnap.key.includes(context.toLowerCase())) {
      const blog = blogSnap.val();
      blog.key = blogSnap.key;
      blogs.push(blog);
    }
  });
  blogs.sort((a, b) => {
    return b.date - a.date;
  });

  const blogsHTML = blogs
    .map((blog) => {
      const blogDescription = blog.description ? `<p class="blog-description">${blog.description}</p>` : "";
      const hiddenClass = ifAdmin ? "" : "hidden ";

      return `
        <div class="blog">
          <p class="blog-title" onclick="viewBlog('${blog.title.toLowerCase()}')">${blog.title}</p>
          ${blogDescription}
          <p class="blog-date">${formatDate(blog.date)}</p>
          <span class="${hiddenClass}blog-delete material-symbols-outlined"
          onclick="adminDelBlog('${blog.title.toLowerCase()}')">delete</span>
        </div>
      `;
    })
    .join("");

  const additional = document.getElementById("additional");
  if (!context || context == "") {
    additional.innerHTML = `Total blogs: ${blogs.length}`;
  } else {
    additional.innerHTML = `Blogs found: ${blogs.length}`;
  }

  blogsContainer.innerHTML = blogsHTML;
};

window.viewBlog = (blogId) => {
  if (!blogId || blogId == "") {
    window.location.hash = "";
    loadMain();
  } else {
    window.location.hash = blogId;
    loadMain();
  }
};

// admin
var ifAdmin = false;
const adminBlogsAdd = document.getElementById("admin-blogs-add");

document.getElementById("admin-btn").onclick = () => {
  if (!ifAdmin) {
    var password = prompt("Enter Password:", "password");
    if (password === "admin") {
      ifAdmin = true;
    } else {
      alert("Wrong password!");
      return;
    }
  }
  if (!location.hash) showDialog("admin-blogs-add");
  loadMain();
};

window.adminAddBlog = async (thisForm, title, description) => {
  if (!ifAdmin) {
    alert("You are not an admin!");
    return;
  }
  if (/[.#$\[\]]/.test(title)) {
    alert('Title can not contain any of the folowing characters:\n".", "#", "$", "[", "]"');
    return;
  }
  if (title.length < 3) {
    alert("Title is too short,\nminimum lenght is 3 characters");
    return;
  }
  if (title.length > 32) {
    alert("Title is too long,\nmaximum lenght is 32 characters");
    return;
  }
  if (description.length > 64) {
    alert("Description is too long,\nmaximum lenght is 64 characters");
    return;
  }
  let snap = await db.get(db.ref(db.link, "blogs/" + title.toLowerCase()));
  if (snap.exists()) {
    alert("Blog with this title already exists!");
    return;
  }
  const blogData = {
    title: title,
    date: Date.now(),
    html: `<h1>${title}</h1>`,
    style: `.blog-body {
  margin-bottom: 16px;
  padding: 12px;
  background: #00000025;
  border-radius: 8px;
}`,
  };
  if (description.length > 0) {
    blogData.description = description;
  }
  await db.set(db.ref(db.link, "blogs/" + title.toLowerCase()), blogData);
  thisForm.querySelector("input[type='submit']").style.background = "#55dbaf";
  thisForm.querySelectorAll("input[type='text']").forEach((thisInput) => {
    thisInput.value = "";
  });
  setTimeout(() => {
    thisForm.querySelector("input[type='submit']").style.background = "#49aebb";
  }, 1000);
  loadMain();
};

window.adminDelBlog = async (blogId) => {
  if (!ifAdmin) {
    alert("You are not an admin!");
    return;
  }
  let snap = await db.get(db.ref(db.link, "blogs/" + blogId));
  if (!snap.exists()) {
    alert("No blog with this title!");
    return;
  }
  if (window.confirm(`Do you realy want to remove ${blogId}?`)) {
    await db.rem(db.ref(db.link, "blogs/" + blogId));
    viewBlog();
  }
};

// views
async function loadViews() {
  let snap = await db.get(db.ref(db.link, "views"));
  if (!snap.exists()) {
    db.set(db.ref(db.link), { views: 1 });
  } else {
    db.upd(db.ref(db.link), { views: snap.val() + 1 });
  }
  document.getElementById("views").innerText = snap.val() + 1;
  setInterval(async () => {
    document.getElementById("views").innerText = (await db.get(db.ref(db.link, "views"))).val();
  }, 5000);
}
