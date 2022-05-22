const express = require("express");
const bodyParser = require("body-parser")

/* Initiation à la base de données et au serveur Express *************************************************/


const { Pool } = require("pg");
const req = require("express/lib/request");
const { password } = require("pg/lib/defaults");


/* Création du serveur Express */
const serv = express();
const {LocalStorage} = require('node-localstorage') 
var localStorage = new LocalStorage('./scratch')
serv.set("view engine", "ejs");         
serv.use(express.static("public"));

serv.use(express.urlencoded({ extended: true }));

serv.use(bodyParser.urlencoded({extended:true}))
serv.use(bodyParser.json())

/* Connexion à la base de donnée PostgreSQL */
const pool = new Pool({
    user: "Postgres",
    host: "localhost",
    database: "testdb",
    password: "",
    port: 5432
});

console.log("Connexion à la base de données : OK.");




/*  LE SERVEUR ECOUTE ET INITIALISATION DES VARIABLES UTILES  ********************************************/

serv.listen(2000);

var connected = false;
var client = false;
var livreur = false;
var mail_connected = '';
var panier = [];

const menu = [
    { image: 'menu-entrees', title: "Les entrées", id: 'entrees' },
    { image: 'menu-pizzas', title: "Les pizzas", id: 'pizzas' },
    { image: 'menu-boissons', title: "Les boissons", id: 'boissons' }
];

const extra_menu = [
    { image: "menu-entrees", title: "Extra Menu", description: "1 entrée, 1 pizza Médium, 2 boissons d’au plus 33cl" },
    { image: "menu-pizzas", title: "Méga Menu", description: "2 entrées, 2 pizzas Médium, 1 boisson d’au moins 1l" },
    { image: "menu-boissons", title: "Giga Menu", description: "2 entrées, 2 pizzas Médium, 1 boisson d’au moins 1l" }
];

console.log("Préparation des données à utiliser : OK.");
console.log("Écoute sur le port 2000. Serveur prêt à recevoir des client : OK.");



/*  LE SERVEUR TRAITE LES DIFFERENTES REQUETES DU CLIENT  ************************************************/


/* Requêtes SQL avec le module PostGre */
async function query(reqSQL) {
    const client = await pool.connect();
    let res;
    try {
        await client.query('BEGIN');
        try {
            res = await client.query(reqSQL);
            await client.query('COMMIT');
        } catch(err) {
            await client.query('ROLLBACK');
            throw err;
        }
    } finally {
        client.release();
    }
    return res;
}


/* Récupère l'index d'un article au panier */
function indexOfPanier(element) {
    for(let i=0; i<panier.length; i++) {
        const e = panier[i];
        if(e[0] === element[0] && e[1] === element[1] && e[2] === element[2] && e[3] === element[3]) {
            return i;
        }
    }
    return -1;
}


/* Ajoute un article au panier */
serv.post("/add_to_cart", function (req) {
    response = {
        plat: req.body.plat,
        id: req.body.id,
        option: req.body.option,
        prix: req.body.prix
    };
    panier.push(response);
    console.log("Ajout de l'article au panier : OK.");
});


/* Supprimer un article du panier */
serv.post("/remove_to_cart", function (req, res, next) {
    response = {
        plat: req.body.plat,
        id: req.body.id,
        option: req.body.option,
        prix: req.body.prix
    };
    
    const number = indexOfPanier(response);
    if(number !== -1) {
        panier.splice(number, 1);
        console.log("Suppresion de l'article au panier : OK.");
    }
});

serv.post("/remove_to_cart_2", function (req, res, next) {
    var index = Number(req.body.index);
    if(index !== -1) {
        panier.splice(index, 1);
        console.log("Suppresion de l'article au panier : OK.");
    }
});


/* Mettre à jour une livraison */
serv.post("/update_livraison", async (req, res) => {
    try {
        const sql = "SELECT id_livreur FROM Livreurs WHERE mail='" + mail_connected + "'";
        const l_rows_array = (await query(sql)).rows;

        const sql1 = "SELECT * FROM commandes WHERE id_livreur='" + l_rows_array[0].id_livreur + "' ORDER BY heure_de_livraison";
        const c_rows_array = (await query(sql1)).rows;

        const sql2 = "DELETE FROM commandes_details WHERE id_commande='" + c_rows_array[0].id_commande + "'";
        const cd_rows = await query(sql2);

        const sql3 = "DELETE FROM commandes WHERE id_commande='" + c_rows_array[0].id_commande + "'";
        const c2_rows = await query(sql3);
        
        console.log("Livraison effectuée : OK.");
    } catch (err) {
        console.log('Database ' + err)
    }

});


/*  LE SERVEUR REGARDE LES LIENS DU COTE CLIENT  *********************************************************/

serv.get('/accueil', async (req, res) => {
    if(livreur) {
        res.render("pages/error.ejs", { c: connected, l: livreur, p: panier });
    } else {
        try {
            const sql = "SELECT * FROM Entrees ORDER BY id_entree";
            const sql2 = "SELECT * FROM Boissons ORDER BY id_boisson";
            const sql3 = "SELECT * FROM Pizzas ORDER BY id_pizza";
            const sql4 = "SELECT * FROM Ingredients ORDER BY id_ingredient";
            
            const e_rows_array = (await query(sql)).rows;
            const b_rows_array = (await query(sql2)).rows;
            const p_rows_array = (await query(sql3)).rows;
            const i_rows_array = (await query(sql4)).rows;

            res.render("pages/accueil.ejs", {
                c: connected,
                l: livreur,
                p: panier,
                menu: menu,
                extra_menu: extra_menu,
                entrees: e_rows_array,
                pizzas: p_rows_array,
                boissons: b_rows_array,
                ingredients: i_rows_array
            });
        } catch (err) {
            console.log('Database ' + err)
        }
    }
});

serv.post('/accueil', async (req, res) => {
    try {
        response = {
            email: req.body.email,
            mdp: req.body.mdp,
        };
        connected = true;
        mail_connected = response.email;
    
        const sql = "SELECT * FROM Entrees ORDER BY id_entree";
        const sql2 = "SELECT * FROM Boissons ORDER BY id_boisson";
        const sql3 = "SELECT * FROM Pizzas ORDER BY id_pizza";
        const sql4 = "SELECT * FROM Ingredients ORDER BY id_ingredient";
        
        const e_rows_array = (await query(sql)).rows;
        const b_rows_array = (await query(sql2)).rows;
        const p_rows_array = (await query(sql3)).rows;
        const i_rows_array = (await query(sql4)).rows;

        res.render("pages/accueil.ejs", {
            c: connected,
            l: livreur,
            p: panier,
            menu: menu,
            extra_menu: extra_menu,
            entrees: e_rows_array,
            pizzas: p_rows_array,
            boissons: b_rows_array,
            ingredients: i_rows_array
        });
    } catch (err) {
        console.log('Database ' + err)
    }
});

serv.get("/connexion", function (req, res) {
    if(connected) res.render("pages/error.ejs", { c: connected, l: livreur, p: panier });
    else res.render("pages/connexion.ejs", { c: connected, l: livreur, p:panier, err: true });
});

serv.post("/connexion", async (req, res)=> {

    var login = {
        ...req.body
    }

    console.log(login)
    
     const sqlogin =  "SELECT id_client FROM clients WHERE mail='" + login.mail + "' and mdp='" + login.mdp + "'"
     const i_rows_array = (await query(sqlogin)).rows;



   

     

     console.log(i_rows_array)
     if(i_rows_array.length === 0) {
        connected = false;
        livreur = false;
        res.render("pages/connexion.ejs", { c: connected, l: livreur, p:panier, err: false });
        return;
    }
    else {
        try {

            connected = true;
            mail_connected = login.mail;
            const sqlogin =  "SELECT id_client FROM clients WHERE mail='" + mail_connected + "' and mdp='" + login.mdp + "'"
            const id_rows_array = (await query(sqlogin)).rows;

            localStorage.setItem('curent_client', id_rows_array[0].id_client)
            // console.log("from localstorage",localStorage.getItem('curent_client'))

        
            const sql = "SELECT * FROM Entrees ORDER BY id_entree";
            const sql2 = "SELECT * FROM Boissons ORDER BY id_boisson";
            const sql3 = "SELECT * FROM Pizzas ORDER BY id_pizza";
            const sql4 = "SELECT * FROM Ingredients ORDER BY id_ingredient";
            
            const e_rows_array = (await query(sql)).rows;
            const b_rows_array = (await query(sql2)).rows;
            const p_rows_array = (await query(sql3)).rows;
            const i_rows_array = (await query(sql4)).rows;

            res.redirect("/accueil")
    
            res.render("pages/accueil.ejs", {
                c: true,
                l: livreur,
                p: panier,
                menu: menu,
                extra_menu: extra_menu,
                entrees: e_rows_array,
                pizzas: p_rows_array,
                boissons: b_rows_array,
                ingredients: i_rows_array
            });



        } catch (err) {
            console.log('Database ' + err)
        }
}});



serv.get("/inscription", function (req, res) {
    if(connected) res.render("pages/error.ejs", { c: connected, l: livreur, p: panier });
    else res.render("pages/Inscription.ejs", { c: connected, l: livreur, p:panier, err: true });
});

serv.post("/inscription", function (req, res) {
    
    var new_user = {
        ...req.body
    }
    console.log(new_user.nom)
   

    // const sql6 = "INSERT INTO clients VALUES (2,'test', 'test', 'test', 'client2@test.com', 'test')";
    
    pool.query(
         `INSERT INTO clients(nom,prenom, adresse,mail,mdp) VALUES ('${new_user.nom}', '${new_user.prenom}', '${new_user.adresse}', '${new_user.mail}', '${new_user.mdp}') `,
        (err, res) => {
          console.log(err, res);
          
        }
      );

      res.redirect("/connexion")
      res.render("pages/connexion.ejs", { c: connected, l: livreur, p:panier, err: true });

    console.log("new user added")
    
    
});

serv.get("/paiement", async(req, res) => {
    if(connected) {
        // On récupère les menus
        const sql2 = "SELECT * FROM Entrees ORDER BY id_entree";
        const sql3 = "SELECT * FROM Boissons ORDER BY id_boisson";
        const sql4 = "SELECT * FROM Pizzas ORDER BY id_pizza";
        const sql5 = "SELECT * FROM Ingredients ORDER BY id_ingredient";
        
        const e_rows_array = (await query(sql2)).rows;
        const b_rows_array = (await query(sql3)).rows;
        const p_rows_array = (await query(sql4)).rows;
        const i_rows_array = (await query(sql5)).rows;

        res.render("pages/paiement.ejs", {
            c: connected,
            l: livreur,
            p: panier,
            entrees: e_rows_array,
            pizzas: p_rows_array,
            boissons: b_rows_array,
            ingredients: i_rows_array,
            err: false
        });
    } else res.render("pages/error.ejs", { c: connected, l: livreur, p: panier });
});

serv.post("/paiement", async (req, res) => {
    const n = panier.length;

    try {
        // On récupère le numéro de commande dans la base de données
        const sql = "SELECT count(id_commande) FROM commandes";
        const nb_commande = (await query(sql)).rows[0].count;

        // On récupère le nombre d'article dans la base de données
        const sql1 = "SELECT count(id_article) FROM commandes_details";
        var nb_article = (await query(sql1)).rows[0].count;

        // On récupère les menus
        const sql2 = "SELECT * FROM Entrees ORDER BY id_entree";
        const sql3 = "SELECT * FROM Boissons ORDER BY id_boisson";
        const sql4 = "SELECT * FROM Pizzas ORDER BY id_pizza";
        const sql5 = "SELECT * FROM Ingredients ORDER BY id_ingredient";
        
        const e_rows_array = (await query(sql2)).rows;
        const b_rows_array = (await query(sql3)).rows;
        const p_rows_array = (await query(sql4)).rows;
        const i_rows_array = (await query(sql5)).rows;

        // On insère les valeurs
        var prix_total = 0;
        for(let i=0; i<n; i++) {
            var insert_sql = "INSERT INTO commandes_details VALUES (";
            insert_sql += nb_article + ", ";
            nb_article++;
            insert_sql += nb_commande + ", '";

            if(panier[i].plat === "entree") {
                insert_sql += e_rows_array[panier[i].id].nom + "', '";
                if(panier[i].option === '1') insert_sql += "Ketchup', ";
                else if(panier[i].option === '2') insert_sql += "Mayonnaise', ";
                else if(panier[i].option === '3') insert_sql += "Barbecue', ";
                else if(panier[i].option === '4') insert_sql += "Curry', ";
                else insert_sql += "#', ";
            } else if(panier[i].plat === "pizza") {
                insert_sql += p_rows_array[panier[i].id].nom + "', '";
                if(panier[i].option === '1') insert_sql += "Small', ";
                else if(panier[i].option === '2') insert_sql += "Medium', ";
                else if(panier[i].option === '3') insert_sql += "Large', ";
                else insert_sql += "XLarge', ";
            } else if(panier[i].plat === "boisson") {
                insert_sql += b_rows_array[panier[i].id].nom + "', '";
                if(panier[i].option === '1') insert_sql += "25cL', ";
                else if(panier[i].option === '2') insert_sql += "33cL', ";
                else if(panier[i].option === '3') insert_sql += "50cL', ";
                else insert_sql += "1L', ";
            } else {
                insert_sql += "Pizza Composable', '";
                const n2 = panier[i].option.length;
                const o_array = panier[i].option;
                for(let j=0; j<n2; j++) {
                    if(j !== n2-1) {
                        insert_sql += i_rows_array[o_array[j][0]].nom + " (" + o_array[j][1] + "), ";
                    } else {
                        if(o_array[j][0] === '12') insert_sql += "Small', ";
                        else if(o_array[j][0] === '13') insert_sql += "Medium', ";
                        else if(o_array[j][0] === '14') insert_sql += "Large', ";
                        else insert_sql += "XLarge', ";
                    }
                }
            }

            insert_sql += panier[i].prix + ")";
            prix_total += parseFloat(panier[i].prix);

            console.log(insert_sql);
            const insert = (await query(insert_sql));
        }

        console.log("Détails de la commande ajoutée à la base de données : OK.");

        // On insère la commande dans la base de données
        var now = new Date(); 
        // const sql6 = "INSERT INTO commandes VALUES (" + nb_commande + ", 19, 0, '12h00', " + prix_total + ")";
        const sql6 = `INSERT INTO commandes VALUES('${nb_commande}', '${localStorage.getItem('curent_client')}', '${0}', '${now.getHours() + ':' + now.getMinutes()}', '${prix_total}')`
        const add_commande = (await query(sql6));

        console.log("Commande ajoutée à la base de données : OK.");

        panier = [];

        res.render("pages/paiement.ejs", {
            c: connected,
            l: livreur,
            p: panier,
            entrees: e_rows_array,
            pizzas: p_rows_array,
            boissons: b_rows_array,
            ingredients: i_rows_array,
            err: true
        });
    } catch (err) {
        console.log('Database ' + err)
    }
});




/*  LE SERVEUR REGARDE LES LIENS DU COTE LIVREUR  ********************************************************/


serv.get('/accueil_livreur', async (req, res) => {
    if(livreur && connected) {
        try {
            const sql = "SELECT id_livreur FROM Livreurs WHERE mail='" + mail_connected + "'";
            const l_rows_array = (await query(sql)).rows;

            const sql1 = "SELECT * FROM commandes  ORDER BY heure_de_livraison";
            const sql2 = "SELECT * FROM commandes_details";
            

            const c_rows_array = (await query(sql1)).rows;
            const cd_rows_array = (await query(sql2)).rows;

            var tab=[]

            for (let i=0; i< c_rows_array.length; i++){
                var sql3 = `SELECT * FROM clients WHERE id_client= ${c_rows_array[i].id_client} `
                var cl_rows_array = (await query(sql3)).rows[0];
                // console.log("from get in for ",cl_rows_array)
                // clienttab.push(cl_rows_array)
                res.render("pages/livreur.ejs", {
                    c: connected,
                    l: livreur,
                    p: panier,
                    commandes : c_rows_array,
                    commandes_details : cd_rows_array,
                    client_commande : cl_rows_array
                });
            }
            console.log("from tab",tab)

            

            // res.render("pages/livreur.ejs", {
            //     c: connected,
            //     l: livreur,
            //     p: panier,
            //     commandes : c_rows_array,
            //     commandes_details : cd_rows_array,
                
                
            // });
        } catch (err) {
            console.log('Database ' + err)
        }
    } else res.render("pages/error.ejs", { c: connected, l: livreur, p: panier });
});

serv.post('/accueil_livreur', async (req, res) => {
    connected = true;
    livreur = true;
    if(livreur && connected) {
        try {
            response = {
                ...req.body
            };
            console.log(response)

            const sql0 = "SELECT id_livreur FROM livreurs WHERE mail='" + response.mail + "' and mdp='" + response.mdp + "'";
            const i_rows_array = (await query(sql0)).rows;

            if(i_rows_array.length === 0) {
                connected = false;
                livreur = false;
                res.render("pages/connexion.ejs", { c: connected, l: livreur, p: panier, err: false });
                return;
            }else {

            mail_connected = response.mail;

            const sql = "SELECT id_livreur FROM livreurs WHERE mail='" + mail_connected + "'";
            const l_rows_array = (await query(sql)).rows;

            const sql1 = "SELECT * FROM commandes  ORDER BY heure_de_livraison";
            const sql2 = "SELECT * FROM commandes_details";
            // const sql3 = "SELECT * FROM clients WHERE id_client=19"


            const c_rows_array = (await query(sql1)).rows;
            const cd_rows_array = (await query(sql2)).rows;

            // tab = tab.push(cl_rows_array)
            var tab = []

            for (let i=0; i< c_rows_array.length; i++){
                var sql3 = `SELECT * FROM clients WHERE id_client= ${c_rows_array[i].id_client} `
                var cl_rows_array = (await query(sql3)).rows;
                // console.log("from post in for ",cl_rows_array[0])
                // clienttab.push(cl_rows_array)
                tab.push(cl_rows_array[0])
  
               
            }
            console.log("from taaaab", tab[1])

            res.render("pages/livreur.ejs", {
                c: connected,
                l: livreur,
                p: panier,
                commandes : c_rows_array,
                commandes_details : cd_rows_array,
                client_commande : tab
            });
            // console.log('from cl_rows_array pushed in clienttab',clienttab[1][0] )


            // res.render("pages/livreur.ejs", {
            //     c: connected,
            //     l: livreur,
            //     p: panier,
            //     commandes : c_rows_array,
            //     commandes_details : cd_rows_array,
            //     client_commande : clienttab
            // });
           
            // id =c_rows_array[0].id_client
            
            // const sql3 = `SELECT * FROM clients WHERE id_client= ${id} `
            // const cl_rows_array = (await query(sql3)).rows;

            
            
            // console.log("commande ",c_rows_array )
            // console.log("commande details", cd_rows_array)
            // console.log("client details", cl_rows_array)

            res.render("pages/livreur.ejs", {
                c: connected,
                l: livreur,
                p: panier,
                commandes : c_rows_array,
                commandes_details : cd_rows_array,
                // client_commande : cl_rows_array
            });
        }
        } catch (err) {
            console.log('Database ' + err)
        }
    } else {
        connected = false;
        livreur = false;
        res.render("pages/connexion.ejs", { c: connected, l: livreur, p: panier, err: false });
    }
});

serv.get("/livraison", function (req, res) {
    if(connected) res.render("pages/error.ejs", { c: connected, l: livreur, p: panier });
    else res.render("pages/connexion.ejs", { c: connected, l: livreur, p:panier, err: true });
});




/*  LE LIVREUR REGARDE LES LIENS DES DEUX COTES  *********************************************************/


serv.get('/profil', async (req, res) => {
    if(connected === false) res.render("pages/error.ejs", { c: connected, l: livreur, p: panier });
    else {
        try {
            const sql = "SELECT * FROM Entrees ORDER BY id_entree";
            const sql2 = "SELECT * FROM Boissons ORDER BY id_boisson";
            const sql3 = "SELECT * FROM Pizzas ORDER BY id_pizza";
            const sql4 = "SELECT * FROM Ingredients ORDER BY id_ingredient";
            var sql5;
            if(livreur) sql5 = "SELECT * FROM Livreurs WHERE mail='" + mail_connected + "'";
            else sql5 = "SELECT * FROM Clients WHERE mail='" + mail_connected + "'";

            const e_rows_array = (await query(sql)).rows;
            const b_rows_array = (await query(sql2)).rows;
            const p_rows_array = (await query(sql3)).rows;
            const i_rows_array = (await query(sql4)).rows;
            const c_rows_array = (await query(sql5)).rows;


            res.render("pages/profil.ejs", {
                c: connected,
                l: livreur,
                p: panier,
                entrees: e_rows_array,
                pizzas: p_rows_array,
                boissons: b_rows_array,
                ingredients: i_rows_array,
                profil: c_rows_array
            });
        } catch (err) {
            console.log('Database ' + err)
        }
    }
});

serv.post('/profil', async (req, res) => {
    response = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        adresse: req.body.adresse,
    };

    try {
        
        var sql = "UPDATE livreurs SET nom ='" + response.nom + "', prenom = '" + response.prenom + "', adresse = '" + response.adresse + "' WHERE mail='" + mail_connected + "'";
        if(livreur==false && connected==true) sql = "UPDATE clients SET nom ='" + response.nom + "', prenom = '" + response.prenom + "', adresse = '" + response.adresse + "' WHERE mail='" + mail_connected + "'";
        const sql1 = "SELECT * FROM Entrees ORDER BY id_entree";
        const sql2 = "SELECT * FROM Boissons ORDER BY id_boisson";
        const sql3 = "SELECT * FROM Pizzas ORDER BY id_pizza";
        const sql4 = "SELECT * FROM Ingredients ORDER BY id_ingredient";
        var sql5;
        if(livreur) sql5 = "SELECT * FROM Livreurs WHERE mail='" + mail_connected + "'";
        else sql5 = "SELECT * FROM Clients WHERE mail='" + mail_connected + "'";

        const u_rows = await query(sql);
        const e_rows_array = (await query(sql1)).rows;
        const b_rows_array = (await query(sql2)).rows;
        const p_rows_array = (await query(sql3)).rows;
        const i_rows_array = (await query(sql4)).rows;
        const c_rows_array = (await query(sql5)).rows;


        res.render("pages/profil.ejs", {
            c: connected,
            l: livreur,
            p: panier,
            entrees: e_rows_array,
            pizzas: p_rows_array,
            boissons: b_rows_array,
            ingredients: i_rows_array,
            profil: c_rows_array
        });
    } catch (err) {
        console.log('Database ' + err)
    }
});

serv.get('/deconnexion', async (req, res) => {
    connected = false;
    livreur = false;
    mail_connected = '';
    localStorage.clear();


    try {
        const sql = "SELECT * FROM Entrees ORDER BY id_entree";
        const sql2 = "SELECT * FROM Boissons ORDER BY id_boisson";
        const sql3 = "SELECT * FROM Pizzas ORDER BY id_pizza";
        const sql4 = "SELECT * FROM Ingredients ORDER BY id_ingredient";

        const e_rows_array = (await query(sql)).rows;
        const b_rows_array = (await query(sql2)).rows;
        const p_rows_array = (await query(sql3)).rows;
        const i_rows_array = (await query(sql4)).rows;

        res.render("pages/accueil.ejs", {
            c: connected,
            l: livreur,
            p: panier,
            menu: menu,
            extra_menu: extra_menu,
            entrees: e_rows_array,
            pizzas: p_rows_array,
            boissons: b_rows_array,
            ingredients: i_rows_array
        });
    } catch (err) {
        console.log('Database ' + err)
    }
});
