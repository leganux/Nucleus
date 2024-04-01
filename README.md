<center>
<img src="nucleusfull.png" width="500px">
</center>

# Nucleus

Avoid bolerplate creating and sharing your own templates and rules with this tool

**Install**

```
npm install @leganux/nucleus -g
```

**Get started**

```
nucleusjs configure
```

**List default templates**

```
nucleusjs list
```

**Create a new template**

```
nucleusjs make
```

**Execute and use a template to your projects**

```
nucleusjs execute
```

**Execute and use a template to your projects based on a JSON template**

```
nucleusjs json -p /path/to/jsonfile.runner.json
```

**Create a project automatically using IA with OpenAI**

```
nucleusjs ai
```

***Example of JSON RUNNER for library***

```JSON 

{
  "name": "library",
  "description": "This JSON allows you to execute automatically the creation of virtual library",
  "steps": [
    {
      "name": "Install template",
      "description": "Install base project based on MVC noSQL",
      "template": "nucleus_FULL_Modules_noSQL",
      "values": {
        "replacer": {
          "name_project": "library",
          "db_connection": "mongodb://localhost/library",
          "api_port": 8000,
          "jwt_secret": "This is my secret",
          "cookie_session_secret": "This is my secret"
        }
      }
    },
    {
      "name": "Create Library table",
      "description": "Install new model for library and configure model",
      "template": "nucleus_model_FULL_Modules_noSQL_generator",
      "values": {
        "replacer": {
          "field_generator": [
            {
              "name": "name",
              "description": "The name of book",
              "customName": "Name",
              "type": "string",
              "mandatory": false,
              "isPassword": false
            },
            {
              "name": "description",
              "description": "The description of book",
              "customName": "Description",
              "type": "string",
              "mandatory": false,
              "isPassword": false
            },
            {
              "name": "stock",
              "description": "The stock of book",
              "customName": "Stock",
              "type": "number",
              "mandatory": false,
              "isPassword": false
            },
            {
              "name": "price",
              "description": "The price of book",
              "customName": "Price",
              "type": "number",
              "mandatory": false,
              "isPassword": false
            }
          ],
          "model_name_file": "library",
          "model_name_variable": "library"
        },
        "appendix": {
          "routes_name": [
            {
              "api_path": "library"
            }
          ],
          "view_fragment": [
            {
              "view_path": "library"
            }
          ],
          "view_menu": [
            {
              "view_path": "library",
              "title": "Books",
              "fa_icon": "fas fa-user"
            }
          ]
        }
      }
    }
  ]
}


```

*Coming soon*

To share a template in our website as public template

```
nucleusjs publish
```

To use a template from website of the community

```
nucleusjs publish
```

## Configure your first example project

```
nucleusjs execute -n nucleus_FULL_Modules_SQL
```

Follow the instructions, and then

```
npm run dev
```

For API Docs visit

https://github.com/leganux/apiatojs

For SDK visit

https://github.com/leganux/code-rag-sdk

For Fake request module visit

https://github.com/leganux/ex-js-faker-request

For more projects visit

https://github.com/leganux/

<hr>


<p align="center">
    <img src="https://leganux.net/images/circullogo.png" width="100" title="hover text">
    <br>
  Nucleus is another project of  <a href="https://leganux.net">leganux.net</a> &copy; 2021 all rights reserved
    <br>
   This project is distributed under the MIT license. 
    <br>
    Special thanks to all developers that work for his contribution to this development.
<br>
    The project was made with ♥️ by Angel Erick Cruz Olivera and leganux team
<br>
<br>
The logo and the name of Nucleus is inspired by the name of Nucleus, the fictional company, from the HBO series, Silicon Valley. This inspiration was taken for fun purposes only. The original name and logo reserve their rights to their original creators. 
</p>
