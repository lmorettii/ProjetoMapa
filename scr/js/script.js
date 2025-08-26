// ===========================
// script.js - mapa interativo
// ===========================

const initialCenter = [-23.55052, -46.633308]; // exemplo São Paulo
const initialZoom = 13;

const map = L.map('map').setView(initialCenter, initialZoom);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Ícone padrão para marcadores normais
const myIcon = L.icon({
  iconUrl: 'assets/icons/marker-icon.png', // ícone padrão
  iconSize: [36, 45],
  iconAnchor: [18, 45],
  popupAnchor: [0, -40]
});

// Ícone especial para o usuário (Meu Local)
const meuLocalIcon = L.icon({
  iconUrl: "assets/icons/seueu.png", // sua imagem
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

let userMarker = null;          // marcador do Meu Local
let dynamicMarkers = [];        // marcadores adicionados dinamicamente
const STORAGE_KEY = 'my-map-locations'; // chave do localStorage

// ----------------------------
// Funções auxiliares
// ----------------------------
function buildPopupContent(place) {
  return `
    <div>
      <h3 style="margin:0">${place.title}</h3>
      <p style="margin:6px 0 0">${place.description || ''}</p>
      ${place.image ? `<img src="${place.image}" alt="${place.title}" />` : ''}
    </div>
  `;
}

function addMarker(place, openPopup = false) {
  const coords = [Number(place.lat), Number(place.lng)];
  const marker = L.marker(coords, { icon: myIcon }).addTo(map);
  marker.bindPopup(buildPopupContent(place));
  if (openPopup) marker.openPopup();

  // Salva na lista de marcadores dinâmicos
  dynamicMarkers.push(marker);
  return marker;
}

// ----------------------------
// Carregar marcadores iniciais
// ----------------------------
async function loadLocationsJson() {
  try {
    const res = await fetch('data/locations.json');
    if (!res.ok) throw new Error('Falha ao carregar locations.json');
    const arr = await res.json();
    arr.forEach(item => addMarker(item));
  } catch (err) {
    console.warn('Erro carregando data/locations.json — use servidor HTTP (Live Server).', err.message);
  }
}

// ----------------------------
// Persistência no LocalStorage
// ----------------------------
function saveToLocal(loc) {
  const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  arr.push(loc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function loadFromLocal() {
  const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  arr.forEach(item => addMarker(item));
}

// ----------------------------
// Adicionar marcador ao clicar no mapa
// ----------------------------
map.on('click', function(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  const title = prompt('Nome do local (ex: Ponto de Coleta):');
  if (!title) return;
  const description = prompt('Descrição (opcional):') || '';
  const newLoc = { title, lat, lng, description, image: '' };
  addMarker(newLoc, true);
  saveToLocal(newLoc);
});

// ----------------------------
// Busca de endereço via Nominatim
// ----------------------------
async function searchAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' }});
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      alert('Endereço não encontrado. Tente ser mais específico.');
      return;
    }

    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);

    const place = {
      title: first.display_name,
      lat: lat,
      lng: lon,
      description: first.type ? `Tipo: ${first.type}` : '',
      image: ''
    };

    map.setView([lat, lon], 15);
    addMarker(place, true);
    saveToLocal(place);
  } catch (err) {
    console.error('Erro ao buscar endereço:', err);
    alert('Ocorreu um erro na busca. Verifique sua conexão e tente novamente.');
  }
}

// ----------------------------
// Remover todos os marcadores dinâmicos e Meu Local
// ----------------------------
function clearMarkers() {
  // remove marcadores dinâmicos
  dynamicMarkers.forEach(m => map.removeLayer(m));
  dynamicMarkers = [];

  // remove o marcador do Meu Local
  if (userMarker) {
    map.removeLayer(userMarker);
    userMarker = null;
  }

  localStorage.removeItem(STORAGE_KEY);
  alert("Todos os pontos adicionados foram removidos!");
}

// ----------------------------
// Localizar usuário via endereço digitado
// ----------------------------
function locateUser() {
  const address = document.getElementById('addressInput').value.trim();
  if (!address) {
    alert("Digite seu endereço no campo acima para marcar seu local.");
    return;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' }})
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        alert('Endereço não encontrado. Tente ser mais específico.');
        return;
      }

      const first = data[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);

      // Remove marcador antigo se existir
      if (userMarker) map.removeLayer(userMarker);

      // Adiciona marcador do usuário com o ícone meuLocalIcon
      userMarker = L.marker([lat, lon], { icon: meuLocalIcon }).addTo(map);
      userMarker.bindPopup("<b>Seu local</b>").openPopup();

      // Centraliza mapa nesse endereço
      map.setView([lat, lon], 16);

    })
    .catch(err => {
      console.error(err);
      alert("Erro ao localizar o endereço. Tente novamente.");
    });
}

// ----------------------------
// Eventos do DOM
// ----------------------------
document.addEventListener('DOMContentLoaded', function() {
  // Formulário de busca
  document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const address = document.getElementById('addressInput').value.trim();
    if (address) searchAddress(address);
  });

  // Botão remover pontos
  document.getElementById('clearMarkersBtn').addEventListener('click', clearMarkers);

  // Botão localizar usuário via endereço
  document.getElementById('locateBtn').addEventListener('click', locateUser);

  // Carrega marcadores iniciais
  loadLocationsJson();
  loadFromLocal();
});
