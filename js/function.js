/*
	Spell Card Strike Deck Builder
	based on WIXOSS_deckeditor (ANGE_UNITE_deckeditor 版的精簡寫法)

	デッキ構築ルール (スペルカードストライク Wiki* 基礎編 / 公式Q&A より)
	- デッキはスペルカード 51枚 + オプション 1枚 = 52枚ちょうど
	- 同じカード名 (ストライカー名 + スペルカード名) は 3枚まで
	  (同じストライカー名でもスペルカード名が違えば別カード)
	- スペルカードのうち 1枚がエース (ゲーム開始時にオプションを装備してステージに置く)
	  → このツールでは エース 1 + デッキ 50 = スペルカード 51 として扱う
*/

const OPTION_MAX = 1;
const ACE_MAX = 1;
const MAIN_MAX = 50;
const SPELL_TOTAL = ACE_MAX + MAIN_MAX;
const SAME_CARD_MAX = 3;
const PAGE_SIZE = 10;

const DECK_LIST_KEY = "SCSDeckNameList";
const DECK_KEY_PREFIX = "SCS_deck_";
const COMMENT_SUFFIX = "_SCScomment";
const DARK_KEY = "scs_dark_mode";

const ATTR_ORDER = ["妖", "霊", "神", "魔", "無"];
const ATTR_HEX = { "妖": "#8e5bd0", "霊": "#3f8fe0", "神": "#e0a020", "魔": "#d94848", "無": "#a0a0a0" };
const ATTR_CHECK = { "妖": "a_you", "霊": "a_rei", "神": "a_kami", "魔": "a_ma", "無": "a_none" };
const RANK_OPTIONS = ["1", "2", "3", "4", "5", "6", "7"];
const COST_ORDER = ["なし", "◯", "◯◯", "属性"];

var cardById = {};
var rdeckArr = [];
var page = 0;

var optionArr = [];
var aceArr = [];
var mainArr = [];

var deckNamelist = [];

var rankobj = null, attrobj = null, costobj = null, raceobj = null;

/* ========================================================= */
/*  Init                                                      */
/* ========================================================= */

// function.js is loaded before jQuery, so wait for DOMContentLoaded instead of $(document).ready
window.addEventListener('DOMContentLoaded', function() {
	for(var i = 0; i < cardData.length; i++)
	{
		cardById[cardData[i][ID]] = cardData[i];
	}

	buildFilterControls();
	buildDeckSlots();
	buildResultSlots();
	buildCharts();
	showInfotable(null);

	document.getElementById('fileinput').addEventListener('change', readSingleFile, false);
	document.getElementById('commentFileinput').addEventListener('change', readSingleCommentFile, false);

	$("#textsearch").keydown(function(event) {
		if(event.keyCode == 13) search();
	});
	$("#selectChara, #selectRace, #selectAff, #selectStype, #selectCost, #selectProduct").change(search);

	onloaddeck();
	search();
	showAlldeck();
	updateDarkModeButton();
	applyDarkModeImages();
});

function hideInfo()
{
	$('#cardinformation').css('visibility', 'hidden');
}

function escapeHtml(s)
{
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ========================================================= */
/*  Card helpers                                              */
/* ========================================================= */

function isOption(c) { return c[KIND] == "O"; }
function attrList(c) { return c[ATTR] ? c[ATTR].split("/") : ["無"]; }
function splitField(c, f) { return c[f] ? c[f].split("/") : []; }
function rankNum(c) { var n = parseInt(c[RANK], 10); return isNaN(n) ? 0 : n; }
function fullName(c) { return (c[CHARA] ? c[CHARA] + " " : "") + c[NAME]; }

function costKind(c)
{
	var s = c[COST];
	if(!s) return "なし";
	if(s == "◯") return "◯";
	if(s == "◯◯") return "◯◯";
	return "属性";
}

function thumbSrc(c)
{
	return "t/" + c[ID].replace("-", "_") + ".webp";
}

function productLabel(idx)
{
	var p = PRODUCT_LIST[idx];
	return p ? p[0] : "";
}

/* ========================================================= */
/*  Filter controls                                           */
/* ========================================================= */

function collectValues(field)
{
	var res = [];
	for(var i = 0; i < cardData.length; i++)
	{
		var list = field == CHARA ? (cardData[i][CHARA] ? [cardData[i][CHARA]] : []) : splitField(cardData[i], field);
		for(var j = 0; j < list.length; j++)
		{
			if(res.indexOf(list[j]) == -1) res.push(list[j]);
		}
	}
	return res;
}

function optionsHtml(allLabel, values, withCount, field)
{
	var str = "<option value=\"0\">" + allLabel + "</option>";
	for(var i = 0; i < values.length; i++)
	{
		var cnt = "";
		if(withCount)
		{
			var n = 0;
			for(var k = 0; k < cardData.length; k++)
			{
				var list = field == CHARA ? [cardData[k][CHARA]] : splitField(cardData[k], field);
				if(list.indexOf(values[i]) != -1) n++;
			}
			cnt = " (" + n + ")";
		}
		str += "<option value=\"" + escapeHtml(values[i]) + "\">" + escapeHtml(values[i]) + cnt + "</option>";
	}
	return str;
}

function buildFilterControls()
{
	var i, str = "";

	for(i = 0; i < RANK_OPTIONS.length; i++)
	{
		str += "<input type=\"checkbox\" id=\"rk_" + RANK_OPTIONS[i] + "\" checked><span onclick=\"clickSpan(this)\">Rank" + RANK_OPTIONS[i] + " </span>&ensp;";
	}
	$("#rankChecks").html(str);

	// ストライカー名: first appearance order
	$("#selectChara").html(optionsHtml("--All ストライカー--", collectValues(CHARA), true, CHARA));
	$("#selectRace").html(optionsHtml("--All 種族--", collectValues(RACE), true, RACE));
	$("#selectAff").html(optionsHtml("--All 所属--", collectValues(AFF), true, AFF));
	$("#selectStype").html(optionsHtml("--All タイプ--", collectValues(STYPE), true, STYPE));

	str = "<option value=\"0\">--All Product--</option>";
	for(i = 0; i < PRODUCT_LIST.length; i++)
	{
		var n = 0;
		for(var k = 0; k < cardData.length; k++) if(cardData[k][PRODUCT] == i) n++;
		str += "<option value=\"p" + i + "\">" + escapeHtml(productLabel(i)) + " (" + n + ")</option>";
	}
	$("#selectProduct").html(str);
}

/* ========================================================= */
/*  Slots                                                     */
/* ========================================================= */

function slotImg(zone, idx, w, h)
{
	return "<img id=\"" + zone + "_" + idx + "\" class=\"deck-slot\" width=\"" + w + "px\" height=\"" + h + "px\" src=\"img/empty.jpg\" alt=\"\"" +
		" onmouseover=\"onmouseShow(this, 'deck');\"" +
		" onclick=\"slotClick(event, '" + zone + "', " + idx + ");\"" +
		" oncontextmenu=\"addDeck(this, null); return false;\">";
}

function buildDeckSlots()
{
	$("#optionZone").html(slotImg("option", 0, 100, 140));
	$("#aceZone").html(slotImg("ace", 0, 100, 140));

	var str = "";
	for(var i = 0; i < MAIN_MAX; i++)
	{
		str += slotImg("main", i, 86, 121);
		if(i % 10 == 9 && i != MAIN_MAX - 1) str += "<br>";
	}
	$("#mainZone").html(str);
}

function buildResultSlots()
{
	var i, s0 = "", s1 = "";
	for(i = 0; i < PAGE_SIZE; i++)
	{
		var tag = "<img id=\"rdeck_" + i + "\" onmouseover=\"onmouseShow(this, 'search');\" onclick=\"addDeck(this, event)\" alt=\"\" height=\"172px\" width=\"122px\" src=\"img/empty.jpg\" style=\"cursor: pointer;\"> ";
		if(i < PAGE_SIZE / 2) s0 += tag; else s1 += tag;
	}
	$("#resultRow0").html(s0);
	$("#resultRow1").html(s1);
}

// 外連的大圖讀取失敗時，改用本機縮圖
document.addEventListener('error', function(e) {
	var img = e.target;
	if(!img || img.tagName !== 'IMG') return;
	var src = img.getAttribute('src') || "";
	if(src.indexOf("https://cdn.wikiwiki.jp/") != 0) return;
	var c = cardById[img.getAttribute('alt') || ""];
	if(c) img.setAttribute('src', thumbSrc(c));
}, true);

/* ========================================================= */
/*  Search                                                    */
/* ========================================================= */

function search()
{
	var keywords = $("#textsearch").val().replace(/　/g, " ").trim().toLowerCase().split(/\s+/).filter(function(s){ return s != ""; });
	var chara = $("#selectChara").val();
	var race = $("#selectRace").val();
	var aff = $("#selectAff").val();
	var stype = $("#selectStype").val();
	var cost = $("#selectCost").val();
	var product = $("#selectProduct").val();
	var onlyChron = $("#onlyChron").prop("checked");
	var showSpell = $("#k_spell").prop("checked");
	var showOption = $("#k_option").prop("checked");

	rdeckArr = [];

	for(var i = 0; i < cardData.length; i++)
	{
		var c = cardData[i];

		if(isOption(c) ? !showOption : !showSpell) continue;

		var al = attrList(c), attrOk = false;
		for(var a = 0; a < al.length; a++) if($("#" + ATTR_CHECK[al[a]]).prop("checked")) { attrOk = true; break; }
		if(!attrOk) continue;

		if(!isOption(c) && c[RANK] && !$("#rk_" + c[RANK]).prop("checked")) continue;

		if(chara != "0" && c[CHARA] != chara) continue;
		if(race != "0" && splitField(c, RACE).indexOf(race) == -1) continue;
		if(aff != "0" && splitField(c, AFF).indexOf(aff) == -1) continue;
		if(stype != "0" && splitField(c, STYPE).indexOf(stype) == -1) continue;
		if(cost != "0" && (isOption(c) || costKind(c) != cost)) continue;
		if(product != "0" && "p" + c[PRODUCT] != product) continue;
		if(onlyChron && !c[CHRON]) continue;

		if(keywords.length > 0)
		{
			var hay = (c[ID] + " " + c[NAME] + " " + c[CHARA] + " " + c[TEXT].replace(/<br>/g, " ") + " " + c[RACE] + " " + c[AFF] + " " + c[STYPE] + " " + productLabel(c[PRODUCT])).toLowerCase();
			var ok = true;
			for(var k = 0; k < keywords.length; k++)
			{
				if(hay.indexOf(keywords[k]) == -1) { ok = false; break; }
			}
			if(!ok) continue;
		}

		rdeckArr.push(c);
	}

	var sortMode = $("#selectSort").val();
	if(sortMode == "1") rdeckArr.sort(function(a, b) { return rankNum(b) - rankNum(a) || cmpId(a, b); });
	else if(sortMode == "2") rdeckArr.sort(function(a, b) { return rankNum(a) - rankNum(b) || cmpId(a, b); });
	else if(sortMode == "3") rdeckArr.sort(function(a, b) { return attrIdx(a) - attrIdx(b) || rankNum(b) - rankNum(a) || cmpId(a, b); });
	else if(sortMode == "4") rdeckArr.sort(function(a, b) { return a[CHARA].localeCompare(b[CHARA], "ja") || cmpId(a, b); });

	page = 0;
	showrdeck();
}

function checkall()
{
	$("input[type=checkbox]").prop("checked", true);
	$("#onlyChron").prop("checked", false);
}

function uncheckall()
{
	$("input[type=checkbox]").prop("checked", false);
}

function resetFilters()
{
	checkall();
	$("#selectChara, #selectRace, #selectAff, #selectStype, #selectCost, #selectProduct").val("0");
	$("#textsearch").val("");
	search();
}

function clickSpan(x)
{
	var cb = $(x).prev("input[type=checkbox]");
	cb.prop("checked", !cb.prop("checked"));
}

function showrdeck()
{
	for(var i = 0; i < PAGE_SIZE; i++)
	{
		var idx = page * PAGE_SIZE + i;
		if(idx < rdeckArr.length)
		{
			$("#rdeck_" + i).attr("src", thumbSrc(rdeckArr[idx])).attr("alt", rdeckArr[idx][ID]).attr("title", fullName(rdeckArr[idx]));
		}
		else
		{
			$("#rdeck_" + i).attr("src", "img/empty.jpg").attr("alt", "").removeAttr("title");
		}
	}
	applyDarkModeImages();

	$("#totalCard").html(rdeckArr.length);
	$("#page").html(rdeckArr.length == 0 ? "0 / 0" : (page + 1) + " / " + Math.ceil(rdeckArr.length / PAGE_SIZE));
}

function changePage(x)
{
	var maxPage = Math.max(0, Math.ceil(rdeckArr.length / PAGE_SIZE) - 1);
	if(x == "back") page = (page > 0) ? page - 1 : maxPage;
	else page = (page < maxPage) ? page + 1 : 0;
	showrdeck();
}

/* ========================================================= */
/*  Sort helpers                                              */
/* ========================================================= */

function attrIdx(c) { return ATTR_ORDER.indexOf(attrList(c)[0]) * 10 + (attrList(c).length - 1); }
function idKey(c)
{
	// SCS01-001 / SCS02-OP01 → オプション番号を後ろへ
	var m = c[ID].match(/^SCS(\d+)-(OP)?(\d+)$/);
	if(!m) return c[ID];
	return m[1] + (m[2] ? "1" : "0") + ("000" + m[3]).slice(-3);
}
function cmpId(a, b) { var x = idKey(a), y = idKey(b); return x < y ? -1 : (x > y ? 1 : 0); }

function sortMain() { mainArr.sort(function(a, b) { return attrIdx(a) - attrIdx(b) || rankNum(b) - rankNum(a) || cmpId(a, b); }); }

/* ========================================================= */
/*  Add / Delete                                              */
/* ========================================================= */

// 「このカードはデッキに何枚でも入れることができる。」(SCS02-212「永夜返し」) は枚数制限なし
function cardLimit(c)
{
	return c[TEXT].indexOf("デッキに何枚でも入れることができる") != -1 ? Infinity : SAME_CARD_MAX;
}

function countById(id)
{
	var n = 0, i;
	for(i = 0; i < aceArr.length; i++) if(aceArr[i][ID] == id) n++;
	for(i = 0; i < mainArr.length; i++) if(mainArr[i][ID] == id) n++;
	return n;
}

var toastTimer = null;
function toast(msg)
{
	var el = document.getElementById("scsToast");
	if(!el)
	{
		el = document.createElement("div");
		el.id = "scsToast";
		el.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);background:rgba(40,40,40,0.92);color:#fff;padding:8px 16px;border-radius:8px;z-index:3000;font-size:14px;pointer-events:none;transition:opacity .2s;";
		document.body.appendChild(el);
	}
	el.textContent = msg;
	el.style.opacity = "1";
	clearTimeout(toastTimer);
	toastTimer = setTimeout(function(){ el.style.opacity = "0"; }, 2200);
}

// Shift+クリック (または デッキ 50枚が埋まっている時) はエースに置く
function addDeck(x, ev)
{
	var id = x.alt;
	if(!id) return;
	var c = cardById[id];
	if(!c) return;

	if(isOption(c))
	{
		if(optionArr.length >= OPTION_MAX)
		{
			if(optionArr[0][ID] == c[ID]) { toast("オプションは1枚のみです"); return; }
			toast("オプションを「" + c[NAME] + "」に入れ替えました");
		}
		optionArr = [c];
		showAlldeck();
		return;
	}

	if(countById(c[ID]) >= cardLimit(c)) { toast("同じカードは" + SAME_CARD_MAX + "枚までです"); return; }

	var toAce = (ev && ev.shiftKey) || (mainArr.length >= MAIN_MAX && aceArr.length == 0);
	if(toAce)
	{
		if(aceArr.length > 0)
		{
			if(mainArr.length >= MAIN_MAX) { toast("デッキが50枚のため、エースを入れ替えられません"); return; }
			mainArr.push(aceArr[0]);
			sortMain();
		}
		aceArr = [c];
	}
	else
	{
		if(mainArr.length >= MAIN_MAX) { toast("スペルカードは51枚 (エース1＋デッキ50) までです"); return; }
		mainArr.push(c);
		sortMain();
	}

	showAlldeck();
}

function slotClick(ev, zone, idx)
{
	if(zone == "main" && ev && ev.shiftKey)
	{
		// デッキのカードをエースにする (元のエースはデッキへ)
		if(idx >= mainArr.length) return;
		var c = mainArr.splice(idx, 1)[0];
		if(aceArr.length > 0) mainArr.push(aceArr[0]);
		aceArr = [c];
		sortMain();
		showAlldeck();
		return;
	}
	if(zone == "ace" && ev && ev.shiftKey)
	{
		// エースをデッキに戻す
		if(aceArr.length == 0) return;
		if(mainArr.length >= MAIN_MAX) { toast("デッキが50枚のため、戻せません"); return; }
		mainArr.push(aceArr[0]);
		aceArr = [];
		sortMain();
		showAlldeck();
		return;
	}
	delDeck(zone, idx);
}

function delDeck(zone, idx)
{
	var arr = zone == "option" ? optionArr : (zone == "ace" ? aceArr : mainArr);
	if(idx >= arr.length) return;
	arr.splice(idx, 1);
	showAlldeck();

	var img = document.getElementById(zone + "_" + idx);
	if(img) onmouseShow(img, 'deck');
}

function cleardeck()
{
	if(!confirm("It will clear current deck. Are you sure?")) return;
	dataInit();
}

function dataInit()
{
	optionArr = [];
	aceArr = [];
	mainArr = [];
	showAlldeck();
}

/* ========================================================= */
/*  Render deck                                               */
/* ========================================================= */

function renderZone(zone, arr, max)
{
	for(var i = 0; i < max; i++)
	{
		var img = $("#" + zone + "_" + i);
		if(i < arr.length) img.attr("src", thumbSrc(arr[i])).attr("alt", arr[i][ID]).attr("title", fullName(arr[i]));
		else img.attr("src", "img/empty.jpg").attr("alt", "").removeAttr("title");
	}
}

function setCount(sel, n, max)
{
	$(sel).text(n + " / " + max).removeClass("ok ng").addClass(n == max ? "ok" : (n > max ? "ng" : ""));
}

function showAlldeck()
{
	renderZone("option", optionArr, OPTION_MAX);
	renderZone("ace", aceArr, ACE_MAX);
	renderZone("main", mainArr, MAIN_MAX);

	setCount("#optionCount", optionArr.length, OPTION_MAX);
	setCount("#aceCount", aceArr.length, ACE_MAX);
	setCount("#mainCount", mainArr.length, MAIN_MAX);
	setCount("#spellCount", aceArr.length + mainArr.length, SPELL_TOTAL);
	setCount("#totalCount", optionArr.length + aceArr.length + mainArr.length, SPELL_TOTAL + OPTION_MAX);

	var msgs = checkDeck();
	if(msgs.length == 0) $("#deckCheck").removeClass("ng").addClass("ok").text("✔ 構築条件を満たしています (52枚)");
	else $("#deckCheck").removeClass("ok").addClass("ng").html(msgs.map(escapeHtml).join("<br>"));

	applyDarkModeImages();
	updatechart();
}

/* ========================================================= */
/*  Deck check                                                */
/* ========================================================= */

function checkDeck()
{
	var msgs = [];
	var spell = aceArr.length + mainArr.length;
	if(spell != SPELL_TOTAL) msgs.push("スペルカード " + spell + " / 51枚");
	if(optionArr.length != OPTION_MAX) msgs.push("オプション " + optionArr.length + " / 1枚");
	if(aceArr.length == 0 && spell > 0) msgs.push("エース未設定 (Shift+クリックでエースに指定)");

	var cnt = {};
	aceArr.concat(mainArr).forEach(function(c) { cnt[c[ID]] = (cnt[c[ID]] || 0) + 1; });
	for(var id in cnt)
	{
		if(cnt[id] > cardLimit(cardById[id])) msgs.push("「" + fullName(cardById[id]) + "」が" + cnt[id] + "枚です (3枚まで)");
	}
	return msgs;
}

/* ========================================================= */
/*  Charts                                                    */
/* ========================================================= */

function getLegendColor()
{
	return document.body.classList.contains('dark-mode') ? '#e6e6e6' : 'rgb(0, 0, 0)';
}

function makeDoughnut(id, labels, colors)
{
	return new Chart(document.getElementById(id), {
		type: 'doughnut',
		data: {
			labels: labels,
			datasets: [{ data: labels.map(function(){ return 0; }), backgroundColor: colors, hoverOffset: 4 }]
		},
		options: {
			plugins: {
				legend: { display: true, labels: { color: getLegendColor(), font: { size: 11 } } }
			}
		}
	});
}

const RACE_CHART = ["妖怪", "人間", "獣", "神", "幽霊", "月人", "その他"];

function buildCharts()
{
	rankobj = makeDoughnut('rankChart', RANK_OPTIONS.map(function(r) { return "R" + r; }),
		['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#9c27b0', '#7b1fa2', '#4a148c']);
	attrobj = makeDoughnut('attrChart', ATTR_ORDER,
		ATTR_ORDER.map(function(a) { return ATTR_HEX[a]; }));
	costobj = makeDoughnut('costChart', COST_ORDER,
		['rgb(201, 203, 207)', 'rgb(255, 205, 86)', 'rgb(255, 159, 64)', 'rgb(255, 99, 132)']);
	raceobj = makeDoughnut('raceChart', RACE_CHART,
		['#8e5bd0', '#f4a261', '#8d6e63', '#e0a020', '#90caf9', '#b0bec5', '#cfcfcf']);
}

function updatechart()
{
	if(!rankobj) return;
	var rk = RANK_OPTIONS.map(function(){ return 0; });
	var at = ATTR_ORDER.map(function(){ return 0; });
	var co = COST_ORDER.map(function(){ return 0; });
	var ra = RACE_CHART.map(function(){ return 0; });

	aceArr.concat(mainArr).forEach(function(c) {
		var r = RANK_OPTIONS.indexOf(c[RANK]);
		if(r >= 0) rk[r]++;
		attrList(c).forEach(function(a) { var i = ATTR_ORDER.indexOf(a); if(i >= 0) at[i]++; });
		co[COST_ORDER.indexOf(costKind(c))]++;
		var races = splitField(c, RACE);
		if(races.length == 0) races = ["その他"];
		var counted = {};
		races.forEach(function(x) {
			var i = RACE_CHART.indexOf(x);
			if(i < 0) i = RACE_CHART.length - 1;
			if(!counted[i]) { ra[i]++; counted[i] = true; }
		});
	});

	rankobj.data.datasets[0].data = rk; rankobj.update();
	attrobj.data.datasets[0].data = at; attrobj.update();
	costobj.data.datasets[0].data = co; costobj.update();
	raceobj.data.datasets[0].data = ra; raceobj.update();
}

function updateChartsTheme()
{
	var color = getLegendColor();
	[rankobj, attrobj, costobj, raceobj].forEach(function(obj) {
		if(obj) { obj.options.plugins.legend.labels.color = color; obj.update(); }
	});
}

/* ========================================================= */
/*  Card preview                                              */
/* ========================================================= */

var bigPicLocked = false;
(function setupBigPicAltLock(){
	function setLocked(v) {
		if(v === bigPicLocked) return;
		bigPicLocked = v;
		window.bigPicLocked = v;
		document.body.classList.toggle('bigpic-locked', v);
	}
	function sync(e) { setLocked(!!e.altKey); }
	window.addEventListener('keydown', function(e) {
		if((e.key === 'Alt' || e.keyCode === 18) && !e.ctrlKey && !e.shiftKey && !e.metaKey) e.preventDefault();
		sync(e);
	}, true);
	window.addEventListener('keyup', sync, true);
	window.addEventListener('mousemove', sync, true);
	window.addEventListener('mouseover', sync, true);
	window.addEventListener('mousedown', sync, true);
	window.addEventListener('blur', function() { setLocked(false); });
})();

function onmouseShow(x, source)
{
	if(bigPicLocked) return;

	if(source == 'search') $('#cardinformation').css('margin', '150px 0px 0px 40px');
	else $('#cardinformation').css('margin', '150px 0px 0px 960px');

	var c = x.alt ? cardById[x.alt] : null;
	if(!c)
	{
		$("#cardinformation").css("visibility", "hidden");
		return;
	}

	$("#cardinformation").css("visibility", "visible");
	// 先放縮圖，再換成 Wiki 原圖 (358×504)
	var big = document.getElementById("big_pic");
	big.setAttribute("alt", c[ID]);
	big.setAttribute("src", c[IMG] || thumbSrc(c));
	showInfotable(c);
}

function infoRow(label, value)
{
	return "<tr><td class='label'>" + label + "</td><td>" + value + "</td></tr>";
}

function attrHtml(c)
{
	return attrList(c).map(function(a) {
		return "<i class='color-chip' style='background:" + ATTR_HEX[a] + "'></i>" + escapeHtml(a == "無" ? "無属性" : a);
	}).join("&ensp;");
}

function showInfotable(c)
{
	var str = "";
	if(!c)
	{
		str += infoRow("カード番号", "");
		str += infoRow("カード名", "");
		str += infoRow("種類", "");
		$("#infoTable").html(str);
		return;
	}

	str += infoRow("カード番号", escapeHtml(c[ID]) + (c[CHRON] ? " <span class='pill'>CHRONICLE 再録</span>" : ""));
	if(c[CHARA]) str += infoRow("ストライカー名", escapeHtml(c[CHARA]));
	str += infoRow(isOption(c) ? "カード名" : "スペルカード名", escapeHtml(c[NAME]));
	str += infoRow("種類", isOption(c) ? "オプション" : "スペルカード");
	str += infoRow("属性", attrHtml(c));
	str += infoRow("Rank", escapeHtml(c[RANK]));

	if(isOption(c))
	{
		if(c[POW] !== "") str += infoRow("補正値", "POW +" + escapeHtml(c[POW]) + " / DEF +" + escapeHtml(c[DEF]));
	}
	else
	{
		str += infoRow("POW / DEF", escapeHtml(c[POW]) + " / " + escapeHtml(c[DEF]));
		str += infoRow("召喚コスト", c[COST] ? escapeHtml(c[COST]) : "なし");
		if(c[RACE]) str += infoRow("種族", escapeHtml(c[RACE].replace(/\//g, "・")));
		if(c[STYPE]) str += infoRow("タイプ", escapeHtml(c[STYPE].replace(/\//g, "・")));
		str += infoRow("所属", c[AFF] ? escapeHtml(c[AFF]) : "－");
		if(c[RANGE] && RANGE_IMG[c[RANGE]]) str += infoRow("攻撃範囲", "<img class='range' src='" + RANGE_IMG[c[RANGE]] + "' alt='" + escapeHtml(c[RANGE]) + "'>");
	}
	str += infoRow("収録", escapeHtml(productLabel(c[PRODUCT])));

	if(c[TEXT]) str += "<tr><td colspan='2' class='abtext'>" + formatText(c[TEXT]) + "</td></tr>";

	var n = countById(c[ID]);
	if(!isOption(c) && n) str += infoRow("デッキ内", n + " 枚");

	var comment = "";
	try { comment = localStorage.getItem(c[ID] + COMMENT_SUFFIX) || ""; } catch(e) {}
	str += "<tr><td colspan='2'><textarea id='comment' placeholder='Comment' style='width: 96%; height: 40px; resize: vertical;' onchange=\"setComment('" + c[ID] + "')\">" + escapeHtml(comment) + "</textarea></td></tr>";

	$("#infoTable").html(str);
}

const ICON_CLASS = { "A": "ic-a", "R": "ic-r", "ターン": "ic-t", "チェイン": "ic-c", "装備": "ic-e", "ルール": "ic-rule", "常": "ic-j" };

function formatText(t)
{
	return t.split("<br>").map(function(line) {
		var m = line.match(/^\[(アビリティ|スペルカード|エクストラ)\]$/);
		if(m) return "<div class='sec sec-" + (m[1] == "スペルカード" ? "s" : (m[1] == "エクストラ" ? "x" : "a")) + "'>" + m[1] + "</div>";
		var s = escapeHtml(line);
		s = s.replace(/^［アビリティ］/, "<span class='sec-inline'>アビリティ</span>");
		s = s.replace(/【(A|R|ターン|チェイン|装備|ルール|常)】/g, function(_, k) { return "<span class='ic " + ICON_CLASS[k] + "'>" + k + "</span>"; });
		s = s.replace(/(コスト：[^ 　]*)$/, "<span class='cost'>$1</span>");
		s = s.replace(/(《[^》]*》)/g, "<b class='kw'>$1</b>");
		return "<div class='ln'>" + s + "</div>";
	}).join("");
}

function setComment(id)
{
	try {
		var v = $("#comment").val();
		if(v != "") localStorage.setItem(id + COMMENT_SUFFIX, v);
		else localStorage.removeItem(id + COMMENT_SUFFIX);
	} catch(e) {}
}

/* ========================================================= */
/*  Popup windows                                             */
/* ========================================================= */

function showPopup(containerId)
{
	var el = document.getElementById(containerId);
	el.style.display = "block";
	window.onmousedown = function(e) {
		if(e.target == el) el.style.display = "none";
	};
}

function openWindow(x)
{
	if(x == "view")
	{
		showDeckView();
		showPopup("window-container");
	}
	else
	{
		showList();
		showPopup("window-container-list");
	}
}

function viewRow(title, arr, w, h)
{
	var s = "<div class='view-row'><span class='view-title'>" + title + " (" + arr.length + ")</span>";
	for(var i = 0; i < arr.length; i++)
	{
		s += "<img width='" + w + "px' height='" + h + "px' src='" + thumbSrc(arr[i]) + "' alt='' title='" + escapeHtml(arr[i][ID] + " " + fullName(arr[i])) + "'>";
	}
	return s + "</div>";
}

function showDeckView()
{
	var str = "";
	var title = $("#selectDeck").val() || "";
	if(title) str += "<div style='font-size:20px;font-weight:bold;margin-bottom:8px;'>" + escapeHtml(title) + "</div>";
	str += "<table><tr><td style='vertical-align: top; padding-right: 20px;'>" + viewRow("オプション", optionArr, 140, 197) + "</td>";
	str += "<td style='vertical-align: top;'>" + viewRow("エース", aceArr, 140, 197) + "</td></tr></table>";
	str += viewRow("デッキ", mainArr, 110, 155);
	$("#deckView").html(str);
}

function groupList(arr)
{
	var list = [];
	for(var i = 0; i < arr.length; i++)
	{
		var found = false;
		for(var j = 0; j < list.length; j++)
		{
			if(list[j][0][ID] == arr[i][ID]) { list[j][1]++; found = true; break; }
		}
		if(!found) list.push([arr[i], 1]);
	}
	return list;
}

function listTable(title, arr)
{
	var g = groupList(arr);
	var s = "<br><b>" + title + " (" + arr.length + ")</b><br><br><table>";
	for(var i = 0; i < g.length; i++)
	{
		var c = g[i][0];
		var info = attrList(c).join("") + " R" + c[RANK];
		s += "<tr><td style='width: 30px;'>" + g[i][1] + "</td><td style='width: 100px;'>" + escapeHtml(c[ID]) + "</td><td style='width: 70px;'>" + escapeHtml(info) + "</td><td>" + escapeHtml(fullName(c)) + "</td></tr>";
	}
	return s + "</table>";
}

function countTable(title, obj)
{
	var s = "<br><b>" + title + "</b><br><br><table>";
	for(var k in obj) s += "<tr><td style='width: 30px;'>" + obj[k] + "</td><td>" + escapeHtml(k) + "</td></tr>";
	return s + "</table>";
}

function showList()
{
	var str = "<table><tr><td style='vertical-align: top;'>";
	str += listTable("オプション", optionArr);
	str += listTable("エース", aceArr);
	str += listTable("デッキ", mainArr);
	str += "</td><td style='vertical-align: top; padding-left: 60px;'>";

	var spells = aceArr.concat(mainArr);
	var rk = {}, at = {}, ch = {};
	RANK_OPTIONS.forEach(function(r) { var n = spells.filter(function(c) { return c[RANK] == r; }).length; if(n) rk["Rank " + r] = n; });
	ATTR_ORDER.forEach(function(a) { var n = spells.filter(function(c) { return attrList(c).indexOf(a) != -1; }).length; if(n) at[a] = n; });
	spells.forEach(function(c) { ch[c[CHARA]] = (ch[c[CHARA]] || 0) + 1; });

	str += countTable("Rank別", rk);
	str += countTable("属性別 (複数属性は重複)", at);
	str += "</td><td style='vertical-align: top; padding-left: 60px;'>";
	str += countTable("ストライカー名別", ch);
	str += "</td></tr></table>";
	$("#decklist").html(str);
}

/* ========================================================= */
/*  Deck code / save / load                                   */
/* ========================================================= */

function buildCode()
{
	var ids = function(arr) { return arr.map(function(c) { return c[ID]; }); };
	return ["option"].concat(ids(optionArr)).join(",") + "\n" +
		["ace"].concat(ids(aceArr)).join(",") + "\n" +
		["main"].concat(ids(mainArr)).join(",");
}

function parseCode(text)
{
	var o = [], a = [], m = [], unknown = [];
	var lines = String(text || "").replace(/\r/g, "").split("\n");
	for(var i = 0; i < lines.length; i++)
	{
		var parts = lines[i].split(",").map(function(x) { return x.trim(); }).filter(function(x) { return x != ""; });
		if(parts.length == 0) continue;
		var head = parts[0].toLowerCase();
		if(head == "option" || head == "ace" || head == "main") parts.shift();
		for(var j = 0; j < parts.length; j++)
		{
			var c = cardById[parts[j].toUpperCase()];
			if(!c) { unknown.push(parts[j]); continue; }
			if(isOption(c)) o.push(c);
			else if(head == "ace") a.push(c);
			else m.push(c);
		}
	}
	return { option: o, ace: a, main: m, unknown: unknown };
}

function applyCode(text)
{
	var r = parseCode(text);
	optionArr = r.option.slice(0, OPTION_MAX);
	aceArr = r.ace.slice(0, ACE_MAX);
	mainArr = r.ace.slice(ACE_MAX).concat(r.main).slice(0, MAIN_MAX);
	sortMain();
	showAlldeck();
	if(r.unknown.length) toast("不明なカード番号: " + r.unknown.join(", "));
}

function openCodeWindow()
{
	$("#textCode").val(buildCode());
	$("#deckTitle").val($("#selectDeck").val() || $("#deckTitle").val() || "Simple Deck");
	$("#deckStr").html("&emsp;");
	showPopup("window-container-code");
}

function loadFromCode()
{
	applyCode($("#textCode").val());
	$("#deckStr").html("Deck code loaded.");
}

function downloadDeck()
{
	var content = buildCode();
	$("#textCode").val(content);
	var blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
	var a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.setAttribute('download', ($("#deckTitle").val() || "deck") + ".csv");
	a.click();
}

function readSingleFile(evt)
{
	var f = evt.target.files[0];
	if(!f) { alert("Failed to load file"); return; }
	$("#deckTitle").val(f.name.replace(/\.(csv|txt)$/i, ""));
	var r = new FileReader();
	r.onload = function(e) {
		$("#textCode").val(e.target.result);
		applyCode(e.target.result);
		$("#deckStr").html("Deck file loaded.");
	};
	r.readAsText(f);
	$("#fileinput").val("");
}

function copyClipboard()
{
	var t = document.querySelector('#textCode');
	t.select();
	try {
		if(navigator.clipboard) navigator.clipboard.writeText(t.value);
		else document.execCommand('copy');
	} catch(e) { document.execCommand('copy'); }
	$("#deckStr").html("Deck code copied!");
}

function saveDeckNameList()
{
	try { localStorage.setItem(DECK_LIST_KEY, JSON.stringify(deckNamelist)); } catch(e) {}
}

function onloaddeck()
{
	try {
		deckNamelist = JSON.parse(localStorage.getItem(DECK_LIST_KEY)) || [];
	} catch(e) {
		deckNamelist = [];
	}
	updateDecklist("");
}

function updateDecklist(select)
{
	var str = "<option value=''>--Select Deck--</option>";
	for(var i = 0; i < deckNamelist.length; i++)
	{
		var n = escapeHtml(deckNamelist[i]);
		str += "<option value='" + n + "'" + (select == deckNamelist[i] ? " selected" : "") + ">" + n + "</option>";
	}
	$("#selectDeck").html(str);
}

function selectDeck()
{
	var deck = $("#selectDeck").val();
	if(!deck) { dataInit(); return; }
	var code = "";
	try { code = localStorage.getItem(DECK_KEY_PREFIX + deck) || ""; } catch(e) {}
	applyCode(code);
}

function addDecklist()
{
	var title = $.trim($("#deckTitle").val());
	if(title == "") { alert("Do not set empty string as title."); return; }

	var exists = deckNamelist.indexOf(title) != -1;
	if(exists && !confirm("Deck exist. Do you want to overwrite it?")) return;

	applyCode($("#textCode").val());
	try { localStorage.setItem(DECK_KEY_PREFIX + title, buildCode()); } catch(e) { alert("Failed to save deck."); return; }
	if(!exists) deckNamelist.push(title);
	saveDeckNameList();
	updateDecklist(title);
	$("#deckStr").html("Deck has been added.");
}

function deletedecklist()
{
	var deck = $("#selectDeck").val();
	if(!deck) return;
	if(!confirm("It will delete this deck. Are you sure?")) return;
	try { localStorage.removeItem(DECK_KEY_PREFIX + deck); } catch(e) {}
	var idx = deckNamelist.indexOf(deck);
	if(idx != -1) deckNamelist.splice(idx, 1);
	saveDeckNameList();
	updateDecklist("");
	dataInit();
}

function resetAllDecks()
{
	if(!confirm("Delete ALL saved decks? This cannot be undone.")) return;
	for(var i = 0; i < deckNamelist.length; i++)
	{
		try { localStorage.removeItem(DECK_KEY_PREFIX + deckNamelist[i]); } catch(e) {}
	}
	deckNamelist = [];
	saveDeckNameList();
	updateDecklist("");
	$("#deckStr").html("All saved decks were deleted.");
}

/* ========================================================= */
/*  Comment manager                                           */
/* ========================================================= */

function collectCurrentComments()
{
	var obj = {};
	try {
		for(var i = 0; i < localStorage.length; i++)
		{
			var k = localStorage.key(i);
			if(k && k.length > COMMENT_SUFFIX.length && k.slice(-COMMENT_SUFFIX.length) == COMMENT_SUFFIX)
			{
				obj[k.slice(0, -COMMENT_SUFFIX.length)] = localStorage.getItem(k);
			}
		}
	} catch(e) {}
	return obj;
}

function openCommentManager()
{
	$("#textCommentCode").val(JSON.stringify(collectCurrentComments(), null, 2));
	$("#commentStr").html("&emsp;");
	showPopup("window-container-comment");
}

function applyCommentText()
{
	var obj;
	try { obj = JSON.parse($("#textCommentCode").val()); } catch(e) { $("#commentStr").html("Invalid JSON."); return; }
	var n = 0;
	for(var k in obj)
	{
		if(!cardById[k]) continue;
		try {
			if(obj[k]) localStorage.setItem(k + COMMENT_SUFFIX, String(obj[k]));
			else localStorage.removeItem(k + COMMENT_SUFFIX);
			n++;
		} catch(e) {}
	}
	$("#commentStr").html(n + " comment(s) applied.");
}

function downloadCommentBlob()
{
	var content = JSON.stringify(collectCurrentComments(), null, 2);
	var blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
	var a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.setAttribute('download', "spellcardstrike_comment.json");
	a.click();
}

function copyCommentClipboard()
{
	var t = document.querySelector('#textCommentCode');
	t.select();
	try {
		if(navigator.clipboard) navigator.clipboard.writeText(t.value);
		else document.execCommand('copy');
	} catch(e) { document.execCommand('copy'); }
	$("#commentStr").html("Comment copied!");
}

function readSingleCommentFile(evt)
{
	var f = evt.target.files[0];
	if(!f) return;
	var r = new FileReader();
	r.onload = function(e) {
		$("#textCommentCode").val(e.target.result);
		applyCommentText();
	};
	r.readAsText(f);
	$("#commentFileinput").val("");
}

function resetAllComments()
{
	if(!confirm("Delete ALL comments? This cannot be undone.")) return;
	var obj = collectCurrentComments();
	for(var k in obj)
	{
		try { localStorage.removeItem(k + COMMENT_SUFFIX); } catch(e) {}
	}
	$("#textCommentCode").val("{}");
	$("#commentStr").html("All comments were deleted.");
}

/* ========================================================= */
/*  Dark mode                                                 */
/* ========================================================= */

function updateDarkModeButton()
{
	var btn = document.getElementById('darkModeToggle');
	if(btn) btn.textContent = document.body.classList.contains('dark-mode') ? '☀ Light' : '🌙 Dark';
}

function swapImageForDarkMode(img, isDark)
{
	var src = img.getAttribute('src');
	if(!src || src.indexOf("img/") != 0) return;
	var pairs = [["empty.jpg", "empty_black.jpg"], ["cancel_icon.png", "cancel_icon_black.png"], ["larrow.png", "larrow_black.png"], ["rarrow.png", "rarrow_black.png"]];
	for(var i = 0; i < pairs.length; i++)
	{
		if(isDark && src == "img/" + pairs[i][0]) { img.setAttribute('src', "img/" + pairs[i][1]); return; }
		if(!isDark && src == "img/" + pairs[i][1]) { img.setAttribute('src', "img/" + pairs[i][0]); return; }
	}
}

function applyDarkModeImages()
{
	var isDark = document.body.classList.contains('dark-mode');
	var imgs = document.getElementsByTagName('img');
	for(var i = 0; i < imgs.length; i++) swapImageForDarkMode(imgs[i], isDark);
}

function toggleDarkMode()
{
	document.body.classList.toggle('dark-mode');
	var isDark = document.body.classList.contains('dark-mode');
	try { localStorage.setItem(DARK_KEY, isDark ? '1' : '0'); } catch(e) {}
	updateDarkModeButton();
	updateChartsTheme();
	applyDarkModeImages();
}

/* ========================================================= */
/*  About                                                     */
/* ========================================================= */

function showVersion()
{
	var str = "";
	str += "Spell Card Strike Deck Builder\n";
	str += "(based on WIXOSS_deckeditor by ZZZ)\n";
	str += "\n";
	str += "20261102 v1.00\n";
	str += "1.First release.\n";
	str += "2.收錄 14 個商品 (スターター／ブースター) 共 " + cardData.length + " 種 (スペルカード 424＋オプション 40)。CHRONICLE 為再録，標示在原卡上。\n";
	str += "3.構築チェック：スペルカード 51 (エース 1＋デッキ 50)、オプション 1、同じカード 3 枚まで (「永夜返し」は無制限)。\n";
	str += "5.能力文字依卡面完整轉寫 (含アビリティ／スペルカード欄、コスト、賦予能力)。\n";
	str += "4.Shift+クリックでエースに指定。\n";
	str += "\n";
	str += "資料來源: スペルカードストライク Wiki* (wikiwiki.jp/scstcg)\n";
	str += "卡圖: Wiki 上的官方 SAMPLE 圖 (縮圖存於 t/，大圖外連 cdn.wikiwiki.jp)\n";

	alert(str);
}
