const BASE_API_URL = "https://api.themoviedb.org/3";
const API_KEY = "bc50218d91157b1ba4f142ef7baaa6a0";
const LANGUAGE = "en-US";
const IMG_URL = "https://image.tmdb.org/t/p/w1280";

let currentPage = 0;
let similarMoviesCurrentPage = 1;
const pixelOffset = 10;
const maxQueryResults = 2;

class App {
	constructor() {
		this.getNowPlaying();
	}

	async getData(target, params) {
		params.append("api_key", API_KEY);
		params.append("language", LANGUAGE);
		let url = BASE_API_URL + target + '?' + params;
		const response = await fetch(url);
		const data = await response.json();
		return data;
	}

	async getNowPlaying() {
		currentPage++;
		const data = await this.getData("/movie/now_playing", new URLSearchParams({
			page: currentPage
		}));

		const view = new View(this);
		view.displayMovies(data.results);
	}

	async getGenres() {
		const data = await this.getData("/genre/movie/list", new URLSearchParams({}));
		return data.genres;
	}

	async getSearchResults(query) {
		const data = await this.getData("/search/movie", new URLSearchParams({
			query: query,
			page: currentPage
		}));

		const view = new View(this);
		const main = document.getElementById("main");
		main.innerHTML = '';
		if (data.results.length > 0) {
			view.displayMovies(data.results);
		} else {
			const main = document.getElementById("main");
			const loadingElement = document.getElementById("loading");
			loadingElement.parentNode.removeChild(loadingElement);
		}
	}

	async getVideos(movieId) {
		const data = await this.getData(`/movie/${movieId}/videos`, new URLSearchParams({}));
		return data.results;
	}

	async getReviews(movieId) {
		const data = await this.getData(`/movie/${movieId}/reviews`, new URLSearchParams({
			page: 1
		}));
		return data.results;
	}

	async getSimilarMovies(movieId) {
		const data = await this.getData(`/movie/${movieId}/similar`, new URLSearchParams({
			page: similarMoviesCurrentPage
		}));
		return data.results;
	}
}



// Models
class Movie {
	constructor(item) {
		this.id = item.id;
		this.posterPath = item.poster_path;
		this.title = item.title;
		this.yearOfRelease = item.release_date;
		this.genreIds = item.genre_ids;
		this.voteAverage = item.vote_average;
		this.overview = item.overview;
	};
}

// Views
class View {
	constructor(app) {
		this.app = app
	};

	displayMovies(movies) {
		const main = document.getElementById("main");
		(async () => {
			const genres = await this.app.getGenres();

			movies.forEach((movie) => {
				const nowPlayingMovie = new Movie(movie);

				const movieGenres = this.getGenreNames(nowPlayingMovie.genreIds, genres);
				var viewGenres = '';
				if (movieGenres && movieGenres.length > 0) {
					movieGenres.forEach(genre => viewGenres += genre.name + ' ');
				} else {
					viewGenres = '-'
				};

				const viewPoster = IMG_URL + nowPlayingMovie.posterPath;

				const yearOfRelease = nowPlayingMovie.yearOfRelease ? '(' + nowPlayingMovie.yearOfRelease.split('-')[0] + ')' : '';

				const movieElement = createElement("div", "movie-container");
				movieElement.innerHTML = `
					<div class="movie" onClick="movieClicked('${nowPlayingMovie.id}','${viewPoster}')">
						<img
							src="${viewPoster}"
							alt="${nowPlayingMovie.title}"
						/>
						<figcaption id="genres">` + viewGenres + `</figcaption>
						<div class="movie-info">
							<h3>${nowPlayingMovie.title} ${yearOfRelease}</h3>
							<span class="${this.getClassByRate(nowPlayingMovie.voteAverage)}">${nowPlayingMovie.voteAverage}</span>
						</div>
						<div class="overview">
							<h3>${nowPlayingMovie.title} ${yearOfRelease}</h3>
							${nowPlayingMovie.overview}
						</div>
					</div>
				`;

				main.appendChild(movieElement);
			});
		})();
	}

	getClassByRate(vote) {
		if (vote >= 8) {
			return "green";
		} else if (vote >= 5) {
			return "orange";
		} else {
			return "red";
		}
	}

	getGenreNames(ids, genres) {
		let intersection = genres.filter(x => ids.some(id => x.id === id));
		return intersection;
	};
};



let app = new App();

// Helper to create an element with an optional id and an optional CSS class
function createElement(tag, className) {
	const element = document.createElement(tag);
	// if (idName) element.setAttribute('id', idName);
	if (className) element.classList.add(className);
	return element;
};

// Helper to retrieve an element from the DOM
function getElement(selector) {
	const element = document.querySelector(selector);
	return element;
};

var toTop = document.getElementById("toTop");
window.addEventListener('scroll', () => {
	if (window.innerHeight + window.scrollY >= document.body.offsetHeight - pixelOffset) {
		app.getNowPlaying();
	}
	scrollToTop();
});

function scrollToTop() {
	if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
		toTop.style.display = "block";
	} else {
		toTop.style.display = "none";
	}
}

function goToTop() {
	document.body.scrollTop = 0;
	document.documentElement.scrollTop = 0;
}

const search = document.getElementById("search");
search.addEventListener("input", (event) => {
	// event.preventDefault();

	const searchValue = event.target.value;

	if (searchValue) {
		app.getSearchResults(searchValue);
	} else {
		currentPage = 0;
		const main = document.getElementById("main");
		main.innerHTML = '';
		app.getNowPlaying();
	}
});

var modalContent = document.getElementById("modalContentId");
var modal = document.getElementById("modalId");
// var span = document.getElementsByClassName("close")[0];

function movieClicked(id, poster) {
	modal.classList.add("expand");
	modal.style.display = "block";
	modalContent.innerHTML = ``;

	(async () => {
		const videos = await app.getVideos(id);
		const trailer = videos.find(video => video.type === 'Trailer');
		const youTubeUrl = trailer ? 'https://www.youtube.com/embed/' + trailer.key + '?autoplay=1' : undefined;

		const reviews = await app.getReviews(id);
		const twoReviews = reviews.slice(0, maxQueryResults);

		const similarMovies = await app.getSimilarMovies(id);


		const firstRowElement = createElement("div", "top-row")

		// Display Trailer
		const videoElement = createElement("div", "details");
		if (youTubeUrl) {
			videoElement.innerHTML = `
				<iframe id="ytplayer" type="text/html" width="400" height="400"	src="${youTubeUrl}"	frameborder="0" allow='autoplay'></iframe>
			`;
		} else {
			videoElement.innerHTML = `
				<span class="trailer-not-found"> We're sorry, trailer not found :( </span>
				<video width="200" height="300" controls>
					<source src="" type="video/mp4">
				</video>
			`;
		}
		firstRowElement.append(videoElement)
		modalContent.append(firstRowElement);

		// Display Reviews
		const reviewsElement = createElement("div", "reviews");
		twoReviews.forEach(review => {
			const date = new Date(review.updated_at);
			const reviewElement = createElement("div", "review");
			reviewElement.innerHTML = `
				<div class="top-header">
					<span class="material-icons-outlined">${'rate_review'}</span>
					<span class="date">${date.toLocaleDateString()}</span>
				</div>
				<h2> ${review.author} <i class="header"> wrote:</i> </h2>
				<p class="truncate">${review.content}</p>
				<button class="read-more" onclick="window.open('${review.url}', '${"_blank"}');">
					<span class="text">read more</span>
					<span class="material-icons-outlined">${'read_more'}</span>
				</button>
			`;
			reviewsElement.append(reviewElement);
		});
		firstRowElement.append(reviewsElement);

		// Display Similar Movies
		const similarElements = createElement("div", "similar-movies");
		similarMovies.forEach((movie) => {
			const similarMovie = new Movie(movie);
			const viewPoster = IMG_URL + similarMovie.posterPath;
			const yearOfRelease = similarMovie.yearOfRelease ? '(' + similarMovie.yearOfRelease.split('-')[0] + ')' : '';

			const movieElement = createElement("div");
			movieElement.innerHTML = `
				<div class="similar-movie">
					<img src="${viewPoster}" alt="${similarMovie.title}" />
				</div>
			`;

			similarElements.appendChild(movieElement);
		});
		modalContent.append(similarElements);

	})();

}

function closeModal() {
	modal.classList.remove("expand");
	modal.style.display = "none";
	modalContent.innerHTML = ``;
}
window.onclick = function (event) {
	if (event.target == modal) {
		modal.classList.remove("expand");
		modal.style.display = "none";
		modalContent.innerHTML = ``;
	}
}
