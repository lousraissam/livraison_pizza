function check_Price() {
    if(document.getElementById('prix-total-panier').innerText === '0') {
        document.querySelector('.btn-panier-final').disabled = true;
    } else document.querySelector('.btn-panier-final').disabled = false;
}

function show_menu_entrees() {
    $('#section-main-contenu').hide();
    $('#section-main-contenu-personnalisation').hide();
    $('#pizzas').hide();
    $('#boissons').hide();
    $('.bg-img-homepage').show();
    $('#entrees').show();
    $('#section-main-contenu-carte').show();
}

function show_menu_pizzas() {
    $('#section-main-contenu').hide();
    $('#section-main-contenu-personnalisation').hide();
    $('#entrees').hide();
    $('#boissons').hide();
    $('.bg-img-homepage').show();
    $('#pizzas').show();
    $('#section-main-contenu-carte').show();
}

function show_menu_boissons() {
    $('#section-main-contenu').hide();
    $('#section-main-contenu-personnalisation').hide();
    $('#entrees').hide();
    $('#pizzas').hide();
    $('.bg-img-homepage').show();
    $('#boissons').show();
    $('#section-main-contenu-carte').show();
}

function show_menu_personnalisation() {
    $('.bg-img-homepage').hide();
    $('#section-main-contenu').hide();
    $('#section-main-contenu-carte').hide();
    $('#section-main-contenu-personnalisation').show();
}



$(document).ready(function () {

    /*  ACCUEIL ET BOUTONS *******************************************************************************/

    $('.btn-panier-remove').click(function() {
        $(this).closest('.element-panier').hide();
        var i = $('.element-panier').index($(this).closest('.element-panier'));

        var prix = 0.0;
        for(let i=0; i<($('.element-panier').length); i++) {
            var element = document.getElementsByClassName('element-panier');
            if(element[i].style.display != 'none') {
                var description = document.getElementsByClassName('prix-element');
                prix += parseFloat(description[i].innerText.substring(0, description[i].innerText.length-1));
            }
        }
        document.getElementById('prix-total-panier').innerHTML = prix;
        check_Price();

        $.post("/remove_to_cart_2", {
            index: i
        });
    });
    
    $('.choix-sauce').hide();
    $('.choix-taille').hide();
    $(".choix-button").click(function () { $(this).next().fadeIn(); });



    /*  PROFIL ET FORMULAIRES  ***************************************************************************/

    $("#button1-modal").click(function () {
        $('#form-modal-nom').css({ display: "inline"});
        $('#form-modal-prenom').css({ display: "inline"});
        $('#form-modal-adresse').css({ display: "none" });
    });

    $("#button2-modal").click(function() {
        $('#form-modal-nom').css({ display: "none"});
        $('#form-modal-prenom').css({ display: "none"});
        $('#form-modal-adresse').css({ display: "inline"});
    });



    /*  PAGE DU LIVREUR  *********************************************************************************/

    if(window.location.href.indexOf("/accueil_livreur") > -1) {
        $('#btn-livraison-eff').click(function() {
            $.post("/update_livraison", { });
            location.reload();
        });
    }

    if(window.location.href.indexOf("/accueil") > -1 || window.location.href.indexOf("/deconnexion") > -1) {
        if(window.location.href.indexOf("/accueil") > -1) check_Price();

        $('#section-main-contenu-carte').hide();
        $('#section-main-contenu-personnalisation').hide();

        $('#nav-la-carte').click(function () { show_menu_entrees(); });
        $('.menu-entrees-link').click(function () { show_menu_entrees(); });
        $('.menu-pizzas-link').click(function () { show_menu_pizzas(); });
        $('.menu-boissons-link').click(function () { show_menu_boissons(); });

    }
});